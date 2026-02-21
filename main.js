const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#000000',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

/* =========================
   GLOBAL STATE
========================= */

let girl, boy;
let groundY;
let currentState = 'locked';   // locked until intro ends
let introState = 'black';

let card, typingText, clickText;
let hugSprite;

let isTyping = false;
let fullMessage = "";
let displayedMessage = "";
let currentSentenceIndex = 0;
const typingSpeed = 40;

let sentences = [
  "Hey Babe! A Very Happy Anniversary My Cutiepie!",
  "This one year has been the best year of my entire life.",
  "I have never been so grateful until I found you.",
  "I hope that many years down the line all I am blessed with is wrinkles on your face and children who look and behave like you.",
  "I love you sooo much and the years to come."
];

/* =========================
   PRELOAD
========================= */

function preload() {
  // Adding a dot before the path ensures GitHub looks in the current folder
  this.load.path = './assets/';

  this.load.image('bg', 'bg.png');
  this.load.image('card', 'template.png');

  this.load.spritesheet('girlIdle', 'a.png', { frameWidth: 159, frameHeight: 193 });
  this.load.spritesheet('boyIdle', 'b.png', { frameWidth: 177, frameHeight: 230 });

  this.load.spritesheet('boyCry', 'cryingfacingleftboy.png', { frameWidth: 136, frameHeight: 124 });
  this.load.spritesheet('girlCry', 'cryingfacingrightgirl.png', { frameWidth: 157, frameHeight: 172 });

  this.load.spritesheet('girlRun', 'lefttorightgirl.png', { frameWidth: 144, frameHeight: 179 });
  this.load.spritesheet('boyRun', 'lefttorightboy.png', { frameWidth: 163, frameHeight: 215 });

  this.load.spritesheet('hug', 'hug.png', { frameWidth: 119, frameHeight: 120 });

  // Error handling listener for GitHub
  this.load.on('loaderror', (file) => {
    console.error('Error loading file: ' + file.src);
  });
}

/* =========================
   CREATE
========================= */

function create() {

  const centerX = this.scale.width / 2;
  const centerY = this.scale.height / 2;

  groundY = this.scale.height * 0.75;

  // Background (hidden until garden)
  const bg = this.add.image(centerX, centerY, 'bg')
    .setDisplaySize(this.scale.width, this.scale.height)
    .setVisible(false);

  /* ========= CARD INTRO UI ========= */

  card = this.add.image(centerX, centerY, 'card')
    .setOrigin(0.5)
    .setDisplaySize(700, 500)
    .setVisible(false)
    .setAlpha(0);

  typingText = this.add.text(centerX, centerY, "", {
    fontFamily: "monospace",
    fontSize: "18px",
    fontStyle: "bold",
    color: "#5a3d2b",
    align: "center",
    lineSpacing: 12,
    wordWrap: { width: 530 }
  })
  .setOrigin(0.5)
  .setVisible(false);

  clickText = this.add.text(centerX, centerY + 220, "Press ENTER ❤️", {
    fontFamily: "Courier", // Changed to safe fallback for GitHub
    fontSize: "14px",
    color: "#ffffff"
  })
  .setOrigin(0.5)
  .setVisible(false);

  this.tweens.add({
    targets: clickText,
    alpha: { from: 1, to: 0.4 },
    duration: 1500,
    yoyo: true,
    repeat: -1
  });

  /* ========= CHARACTERS ========= */

  girl = this.add.sprite(this.scale.width * 0.35, groundY, 'girlIdle')
    .setOrigin(0.5, 1)
    .setInteractive({ draggable: true });

  boy = this.add.sprite(this.scale.width * 0.65, groundY, 'boyIdle')
    .setOrigin(0.5, 1)
    .setInteractive({ draggable: true });

  girl.idleHeight = girl.height;
  boy.idleHeight = boy.height;

  makeAnim(this, 'girlIdle', 'girlIdle', 4);
  makeAnim(this, 'boyIdle', 'boyIdle', 4);
  makeAnim(this, 'girlCry', 'girlCry', 4);
  makeAnim(this, 'boyCry', 'boyCry', 4);
  makeAnim(this, 'girlRun', 'girlRun', 6);
  makeAnim(this, 'boyRun', 'boyRun', 6);
  makeAnim(this, 'hugAnim', 'hug', 4);

  girl.play('girlIdle');
  boy.play('boyIdle');

  girl.setVisible(false);
  boy.setVisible(false);

  /* ========= INTRO FLOW ========= */

  this.input.keyboard.on('keydown-ENTER', () => {

    if (introState === 'black') {
      introState = 'card';
      card.setVisible(true);
      clickText.setVisible(true);
      this.tweens.add({ targets: card, alpha: 1, duration: 800 });
    }

    else if (introState === 'card') {
      clickText.setVisible(false);
      startIntroRun(this);
    }

    else if (introState === 'typing' && !isTyping) {
      clickText.setVisible(false);

      if (currentSentenceIndex < sentences.length - 1) {
        currentSentenceIndex++;
        startTyping(this);
      } else {
        startGarden(this, bg);
      }
    }
  });

  /* ========= ORIGINAL DRAG SYSTEM ========= */

  this.input.on('dragstart', (pointer, obj) => {
    if (currentState !== 'idle') return;

    if (obj === boy) {
      currentState = 'draggingBoy';
      girl.play('girlCry');
    }

    if (obj === girl) {
      currentState = 'draggingGirl';
      boy.play('boyCry');
    }
    obj.setDepth(10);
  });

  this.input.on('drag', (pointer, obj, x, y) => {
    obj.x = x;
    obj.y = Phaser.Math.Clamp(y, groundY - 200, groundY);
  });

  this.input.on('dragend', (pointer, obj) => {
    obj.setDepth(5);
    obj.y = groundY;
    if (currentState !== 'idle' && currentState !== 'locked') {
      reunite(this);
    }
  });
}

/* =========================
   INTRO RUN + HUG
========================= */

function startIntroRun(scene) {
  introState = 'run';
  girl.setVisible(true);
  boy.setVisible(true);
  girl.setPosition(-100, groundY).setFlipX(false).play('girlRun');
  boy.setPosition(scene.scale.width + 100, groundY).setFlipX(true).play('boyRun');

  const meetX = scene.scale.width / 2;

  scene.tweens.add({ targets: girl, x: meetX - 20, duration: 1200 });
  scene.tweens.add({
    targets: boy,
    x: meetX + 20,
    duration: 1200,
    onComplete: () => startIntroHug(scene)
  });
}

function startIntroHug(scene) {
  girl.setVisible(false);
  boy.setVisible(false);

  hugSprite = scene.add.sprite(scene.scale.width/2, groundY, 'hug')
    .setOrigin(0.5,1)
    .play('hugAnim');

  scene.time.delayedCall(2000, () => {
    hugSprite.destroy();
    startTyping(scene);
  });
}

/* =========================
   TYPING
========================= */

function startTyping(scene) {
  introState = 'typing';
  card.setVisible(true);
  typingText.setVisible(true);

  fullMessage = sentences[currentSentenceIndex];
  displayedMessage = "";
  typingText.setText("");
  isTyping = true;

  scene.time.addEvent({
    delay: typingSpeed,
    repeat: fullMessage.length - 1,
    callback: () => {
      displayedMessage += fullMessage[displayedMessage.length];
      typingText.setText(displayedMessage);

      if (displayedMessage.length === fullMessage.length) {
        isTyping = false;
        clickText.setVisible(true);
      }
    }
  });
}

/* =========================
   GARDEN START
========================= */

function startGarden(scene, bg) {
  introState = 'garden';
  currentState = 'idle';

  scene.cameras.main.fadeOut(800, 0, 0, 0);

  scene.cameras.main.once('camerafadeoutcomplete', () => {
    card.destroy();
    typingText.destroy();
    clickText.destroy();

    bg.setVisible(true);
    girl.setVisible(true);
    boy.setVisible(true);

    girl.play('girlIdle');
    boy.play('boyIdle');

    girl.x = scene.scale.width * 0.35;
    boy.x = scene.scale.width * 0.65;

    scene.cameras.main.fadeIn(800, 0, 0, 0);
  });
}

/* =========================
   ORIGINAL REUNION LOGIC
========================= */

function reunite(scene) {
  currentState = 'reuniting';
  girl.stop();
  boy.stop();

  const meetX = (girl.x + boy.x) / 2;

  if (girl.x < boy.x) {
    girl.setFlipX(false);
    boy.setFlipX(true);
  } else {
    girl.setFlipX(true);
    boy.setFlipX(false);
  }

  girl.play('girlRun');
  boy.play('boyRun');

  scene.tweens.add({
    targets: girl,
    x: meetX - 8,
    duration: 800
  });

  scene.tweens.add({
    targets: boy,
    x: meetX + 8,
    duration: 800,
    onComplete: () => gardenHug(scene)
  });
}

function gardenHug(scene) {
  currentState = 'hugging';
  girl.setVisible(false);
  boy.setVisible(false);

  const hugSprite = scene.add.sprite(
    (girl.x + boy.x) / 2,
    groundY,
    'hug'
  ).setOrigin(0.5, 1);

  hugSprite.play('hugAnim');

  scene.time.delayedCall(3000, () => {
    hugSprite.destroy();
    girl.setVisible(true);
    boy.setVisible(true);
    girl.play('girlIdle');
    boy.play('boyIdle');
    girl.x = scene.scale.width * 0.35;
    boy.x = scene.scale.width * 0.65;
    currentState = 'idle';
  });
}

function update(){}

function makeAnim(scene, key, sheet, fps) {
  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(sheet),
    frameRate: fps,
    repeat: -1
  });
}