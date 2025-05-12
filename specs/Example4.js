export default class MyScene extends Phaser.Scene {

  // Define static dimensions for use in EditorScene
  static WIDTH = 1024;
  static HEIGHT = 896;

  constructor() {
    super({ key: "MyScene" });
  }

  preload() {
    // No external assets to load;
    // we will generate textures for emojis on the fly.
  }

  create() {
    // Fade camera in
    this.cameras.main.setAlpha(0);
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      duration: 1000,
      ease: "Linear"
    });

    // Create a Text object and give it arcade physics
    const invader = this.add.text(400, 300, "👾", { fontSize: "64px" });
    invader.setDepth(1); // Bring the emoji to the front
    this.physics.add.existing(invader);
    invader.body.setVelocity(150, 150);
    invader.body.setBounce(1, 1);
    invader.body.setCollideWorldBounds(true);
    invader.body.onWorldBounds = (body, up, down, left, right) => {
      if ((up && left) || (up && right) || (down && left) || (down && right)) {
        invader.setTint(Math.random() * 0xffffff);
        this.cameras.main.shake(100, 0.05);
      }
    };
    invader.setInteractive();
    // invader.filters.internal.addBloom(); // Removed - Caused error

    // Create a second invader
    const invader2 = this.add.text(200, 150, "👾", { fontSize: "64px" });
    invader2.setDepth(1);
    this.physics.add.existing(invader2);
    invader2.body.setVelocity(-150, -150);
    invader2.body.setBounce(1, 1);
    invader2.body.setCollideWorldBounds(true);
    invader2.setInteractive();
    // invader2.filters.internal.addBloom(); // Removed - Caused error

    // Enable collision between invaders
    this.physics.add.collider(invader, invader2, () => {
      invader.setTint(Math.random() * 0xffffff);
      invader2.setTint(Math.random() * 0xffffff);

      // Emit "Brooke" particles from invader
      const brookeText = "Brooke";
      const brookeTextureKey = "emoji-" + brookeText;
      this.generateEmojiTexture(brookeText, brookeTextureKey);
      const emitter1 = this.add.particles(
        invader.x,
        invader.y,
        brookeTextureKey,
        {
          lifespan: 2000,
          speed: { min: 50, max: 100 },
          scale: { start: 0.5, end: 0 },
          gravityY: 50,
          blendMode: "ADD",
          emitting: false
        }
      );
      emitter1.explode(20);

      // Emit "Sawyer" particles from invader2
      const sawyerText = "Sawyer";
      const sawyerTextureKey = "emoji-" + sawyerText;
      this.generateEmojiTexture(sawyerText, sawyerTextureKey);
      const emitter2 = this.add.particles(
        invader2.x,
        invader2.y,
        sawyerTextureKey,
        {
          lifespan: 2000,
          speed: { min: 50, max: 100 },
          scale: { start: 0.5, end: 0 },
          gravityY: 50,
          blendMode: "ADD",
          emitting: false
        }
      );
      emitter2.explode(20);
    });

    // Handle invader clicks
    invader.on("pointerdown", (pointer) => {
      const randomXVelocity = Phaser.Math.Between(-300, 300);
      const randomYVelocity = Phaser.Math.Between(-300, 300);
      invader.body.setVelocity(randomXVelocity, randomYVelocity);
    });

    invader2.on("pointerdown", (pointer) => {
      const randomXVelocity = Phaser.Math.Between(-300, 300);
      const randomYVelocity = Phaser.Math.Between(-300, 300);
      invader2.body.setVelocity(randomXVelocity, randomYVelocity);
    });

    // Handle user clicks
    this.input.on("pointerdown", (pointer) => {
      const emojis = ["💥", "✨", "🌟", "💫", "💨", "Cat", "All the🙂"];
      const randomEmoji = Phaser.Utils.Array.GetRandom(emojis);
      const textureKey = "emoji-" + randomEmoji;

      this.generateEmojiTexture(randomEmoji, textureKey);

      const emitter = this.add.particles(pointer.x, pointer.y, textureKey, {
        lifespan: 4000,
        speed: { min: 150, max: 250 },
        scale: { start: 0.8, end: 0 },
        gravityY: 150,
        blendMode: "ADD",
        emitting: false
      });

      emitter.explode(50);
    });

    this.scene.run("gameScene");
  }

  update() {
    // Empty for now
  }

  /**
   * Generate a texture on the fly from an emoji (or any text).
   * This will create a “key” in Phaser’s texture manager so that
   * the particles can use it as an image/texture frame.
   */
  generateEmojiTexture(emoji, key) {
    if (this.textures.exists(key)) return;

    // Create an off-screen Text object
    const tempText = this.add
      .text(0, 0, emoji, {
        fontSize: "64px",
        color: "#fff"
      })
      .setOrigin(0, 0) // Ensure text origin is at top-left
      .setVisible(false); // Hide from the main scene

    // Force Phaser to measure text fully
    tempText.updateText();

    // Use the measured width/height
    const { width, height } = tempText;

    // Create a RenderTexture with the same measured size
    const rt = this.make.renderTexture(
      {
        x: 0,
        y: 0,
        width,
        height
      },
      false
    );

    // Draw the text at (0,0) on the RenderTexture
    rt.draw(tempText, 0, 0);

    // Save the RenderTexture as a new texture key in the Texture Manager
    rt.saveTexture(key);

    // Cleanup
    tempText.destroy();
    rt.destroy();
  }
}