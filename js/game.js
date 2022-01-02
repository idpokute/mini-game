let gameScene = new Phaser.Scene("Game");
let score = 0;
let bgm = null;

// 리소스를 로드
gameScene.preload = function () {
  // bg
  this.load.image("background", "img/background.png");

  // char
  this.load.spritesheet("player_idle", "img/idle.png", {
    frameWidth: 32,
    frameHeight: 32,
  });
  this.load.spritesheet("player_run", "img/run.png", {
    frameWidth: 32,
    frameHeight: 32,
  });

  // bat
  this.load.spritesheet("bat_fly", "img/Flying_46x30.png", {
    frameWidth: 46,
    frameHeight: 30,
  });
  // goal
  this.load.image("goal", "img/goal.png");

  // particle
  this.load.atlas(
    "flares",
    "https://labs.phaser.io/assets/particles/flares.png",
    "https://labs.phaser.io/assets/particles/flares.json",
  );

  // Sound
  this.load.audio("pick", "sound/Pickup_004.wav");
  this.load.audio("hit", "sound/002.wav");
  this.load.audio("bgm", "sound/Light Music.ogg");
};

// 게임 데이터를 준비
gameScene.create = function () {
  this.isGameOver = false;
  this.isGamePause = false;
  this.isPlayerMoving = false; // animation
  this.enemyBoundaryMinY = 30;
  this.enemyBoundaryMaxY = this.sys.game.config.height / 2 + 65;
  this.batSpeedMin = 1;
  this.batSpeedMax = 2;
  this.charScale = 0.5;

  this.background = this.add.sprite(0, 0, "background");
  this.background.setOrigin(0, 0);

  // Goal
  this.goal = this.add.sprite(
    this.sys.game.config.width - 40,
    this.sys.game.config.height / 2 + 80,
    "goal",
  );
  this.goal.setOrigin(0.5, 1);

  // Animations
  this.anims.create({
    key: "player_idle_anim",
    frames: this.anims.generateFrameNumbers("player_idle"),
    frameRate: 20,
    repeat: -1,
  });
  this.anims.create({
    key: "player_run_anim",
    frames: this.anims.generateFrameNumbers("player_run"),
    frameRate: 20,
    repeat: -1,
  });
  this.anims.create({
    key: "bat_fly_anim",
    frames: this.anims.generateFrameNumbers("bat_fly"),
    frameRate: 20,
    repeat: -1,
  });

  // Player
  this.player = this.add.sprite(
    32,
    this.sys.game.config.height / 2 + 65,
    "player_idle",
  );
  this.player.anims.play("player_idle_anim");
  this.player.speed = 2;
  // 충돌 박스
  this.player.rect = new Phaser.Geom.Rectangle(
    this.player.x,
    this.player.y,
    this.player.width * this.charScale,
    this.player.height * this.charScale,
  );
  // 충돌 박스 위치 조절
  Phaser.Geom.Rectangle.CenterOn(
    this.player.rect,
    this.player.x,
    this.player.y,
  );

  // 디버깅: 바운딩 상자를 표시
  this.graphics = this.add.graphics({
    lineStyle: { width: 2, color: 0x0000aa },
  });

  this.enemies = this.add.group({
    key: "bat_fly",
    repeat: 3,
    setXY: {
      x: 80,
      y: 50,
      stepX: 100,
      stepY: 20,
    },
  });

  Phaser.Actions.Call(
    this.enemies.getChildren(),
    function (enemy) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed =
        this.batSpeedMin +
        Math.random() * (this.batSpeedMax - this.batSpeedMin);

      enemy.speed = dir * speed;

      enemy.rect = new Phaser.Geom.Rectangle(
        enemy.x,
        enemy.y,
        enemy.width * 0.8,
        enemy.height * 1,
      );
      enemy.anims.play("bat_fly_anim");
    },
    this,
  );

  // 방향키 입력
  this.cursors = this.input.keyboard.createCursorKeys();
  // this.input.on(
  //   "pointermove",
  //   function (pointer) {
  //     this.player.x = pointer.x;
  //     this.player.y = pointer.y;
  //     // let bound = this.player.getBounds();

  //     Phaser.Geom.Rectangle.CenterOn(this.player.rect, pointer.x, pointer.y);
  //   },
  //   this,
  // );

  this.scoreText = this.add.text(
    this.sys.game.config.width / 2,
    20,
    "SCORE: " + score,
    {
      color: "#FF0",
      fontSize: 20,
      stroke: "#000",
      strokeThickness: 3,
    },
  );
  this.scoreText.setOrigin(0.5, 0);

  // 파티클
  this.particles = this.add.particles("flares");
  const { width, height } = this.scale;
  this.emitter = this.particles.createEmitter({
    on: false,
    alpha: { start: 1, end: 0, ease: "Cubic.easeIn" },
    angle: { start: 0, end: 360, steps: 100 },
    blendMode: "ADD",
    frame: {
      frames: ["red", "yellow", "green", "blue"],
      cycle: true,
      quantity: 500,
    },
    frequency: 2000,
    gravityY: 300,
    lifespan: 1000,
    quantity: 500,
    reserve: 500,
    scale: { min: 0.05, max: 0.15 },
    speed: { min: 300, max: 600 },
    x: width / 2,
    y: height / 2,
  });

  // console.log(this.emitter.toJSON());
  this.pickSound = this.sound.add("pick");
  this.hitSound = this.sound.add("hit");
  if (!bgm) {
    console.log("hoi");
    bgm = this.sound.add("bgm");

    const musicConfig = {
      mute: false,
      volume: 1,
      rate: 1,
      delay: 0,
      loop: true,
    };

    bgm.play(musicConfig);
  }
};

// 게임 루프
gameScene.update = function () {
  this.graphics.clear();
  if (this.isGameOver || this.isGamePause) return;

  let playerRect = this.player.rect;
  let goalRect = this.goal.getBounds();

  if (this.input.activePointer.isDown || this.cursors.space.isDown) {
    this.player.x += this.player.speed;
    Phaser.Geom.Rectangle.CenterOn(
      this.player.rect,
      this.player.x,
      this.player.y,
    );

    if (!this.isPlayerMoving) {
      this.player.anims.play("player_run_anim");
      this.isPlayerMoving = true;
    }
  } else {
    if (this.isPlayerMoving) {
      this.player.anims.play("player_idle_anim");
      this.isPlayerMoving = false;
    }
  }

  if (Phaser.Geom.Intersects.RectangleToRectangle(goalRect, this.player.rect)) {
    this.isPlayerMoving = false;
    this.isGamePause = true;
    score++;
    this.scoreText.setText("SCORE: " + score);
    this.pickSound.play();

    const { width, height } = this.scale;
    const { FloatBetween } = Phaser.Math;
    const min = 5;
    const max = 10;
    const totalEmitter = min + Math.random() * (max - min);
    for (let i = 0; i < totalEmitter; i++) {
      this.particles.emitParticleAt(
        width * FloatBetween(0.25, 0.75),
        height * FloatBetween(0, 0.5),
        100,
      );
    }

    this.time.delayedCall(1000, () => {
      this.scene.restart();
    });
  }

  // Enemy Update
  this.enemies.getChildren().forEach((enemy) => {
    enemy.y += enemy.speed;

    Phaser.Geom.Rectangle.CenterOn(enemy.rect, enemy.x, enemy.y);

    if (enemy.y > this.enemyBoundaryMaxY) {
      enemy.speed *= -1;
    } else if (enemy.y < this.enemyBoundaryMinY) {
      enemy.speed *= -1;
    }

    // 플레이어와 충돌했는지 체크
    let batRect = enemy.rect;
    // this.graphics.strokeRectShape(enemy.rect);

    if (Phaser.Geom.Intersects.RectangleToRectangle(batRect, playerRect)) {
      this.particles.emitParticleAt(enemy.x, enemy.y, 50);
      this.hitSound.play();

      // console.log("박쥐와 충돌했어요.", playerRect);
      this.gameOver();
    }
  });

  // this.graphics.strokeRectShape(this.player.rect);
};

gameScene.gameOver = function () {
  this.isGameOver = true;
  this.cameras.main.shake(300);

  this.cameras.main.on(
    "camerashakecomplete",
    function (camera) {
      this.cameras.main.fade(2000);
    },
    this,
  );

  this.cameras.main.on(
    "camerafadeoutcomplete",
    function () {
      score = 0;
      this.scene.restart();
    },
    this,
  );
};

let config = {
  type: Phaser.AUTO,
  width: 480,
  height: 320,
  scene: [gameScene],
};

let game = new Phaser.Game(config);
