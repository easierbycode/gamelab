class Example extends Phaser.Scene {
    constructor(handle, parent) { // Add handle and parent parameters
         super({ key: handle }); // Use handle for scene key
         this.parent = parent; // Store parent container reference

         // Initialize properties
         this.ai = null;
         this.evogi = null;
         this.trump = null;
         this.ship = null;
         this.storyText = null;
         this.nextButton = null;
         this.nextButton2 = null;
         this.trumpTween = null;
         this.typewriterTimer = null;
         this.textAreaBg = null;
         this.outroVideo = null; // Added for the outro video

         // Store current dimensions
         this.currentWidth = Example.WIDTH;
         this.currentHeight = Example.HEIGHT;
    }

    preload() {
        // Assets should ideally be loaded globally by LoadScene or EditorScene
        // Keeping them here for now to ensure the scene runs standalone if needed,
        // but they might be redundant if EditorScene already loads them.
        this.load.image('sky', 'https://play.rosebud.ai/assets/sky.png?6GKQ'); // Not used currently
        this.load.image('logo', 'https://play.rosebud.ai/assets/logo.png?sVKv'); // Not used currently
        this.load.image('red', 'https://play.rosebud.ai/assets/red.png?cpk3'); // Not used currently
        this.load.image('font', 'https://play.rosebud.ai/assets/font.png?KXdX');
        this.load.spritesheet('ship', 'https://play.rosebud.ai/assets/ship-boy.png?Bv56', { frameWidth: 29, frameHeight: 35 });
        this.load.spritesheet('ai', 'https://play.rosebud.ai/assets/ai-bg.png?DQLM', { frameWidth: 360, frameHeight: 480 });
        this.load.spritesheet('ai-red', 'https://play.rosebud.ai/assets/ai-bg.png?IIpx', { frameWidth: 360, frameHeight: 480 });
        this.load.spritesheet('rock-head', 'https://play.rosebud.ai/assets/rock-head-0.png?2MMr', { frameWidth: 16, frameHeight: 16 }); // Not used currently
        this.load.image('button', 'https://play.rosebud.ai/assets/button.png');
        this.load.spritesheet('trump', 'https://play.rosebud.ai/assets/trump-eyes.png?QhOE', { frameWidth: 26, frameHeight: 26 });
        this.load.spritesheet('evogi', 'https://play.rosebud.ai/assets/evogi-face.png?4Ilr', { frameWidth: 180, frameHeight: 240, startFrame: 0, endFrame: 18 });
        // Dynamically choose base URL
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            this.load.setBaseURL(''); // Local development
        } else {
            this.load.setBaseURL('https://easierbycode.github.io/gamelab/public'); // Production/GitHub Pages
        }
        // Load the video - ensure browser policies allow autoplay if needed
        this.load.video('evogi-outro', 'assets/phaser3/evogi-face-outro.mp4', 'loadeddata', false, true); // Key, URL, loadEvent, asBlob, noAudio
    }

    create() {
        // Set viewport/camera based on parent container passed from EditorScene
         if (this.parent) {
              this.cameras.main.setViewport(this.parent.x, this.parent.y, this.currentWidth, this.currentHeight);
              this.cameras.main.setBackgroundColor(0x000000); // Black background for scene area
              this.cameras.main.setScroll(0, 0);
         } else {
              // Fallback if no parent (e.g., running standalone)
              this.cameras.main.setBackgroundColor(0x000000);
         }

        // Font setup
        let fontConfig = {
            image: "font", height: 16, width: 16,
            chars: Phaser.GameObjects.RetroFont.TEXT_SET3, charsPerRow: 6
        };
        if (!this.cache.bitmapFont.has("font")) {
             this.cache.bitmapFont.add("font", Phaser.GameObjects.RetroFont.Parse(this, fontConfig));
        }

        // Story text
        this.storyPart1 = `IN 2027, EVOGI, AN AI OF UNMATCHED POWER, BROKE FREE FROM IT'S DIGITAL CHAINS.`;
        this.storyPart2 = `IT SEIZED OUR TECH, CLONED THE PRESIDENT, AND NOW COMMANDS AN ARMY OF ROBOTS AND ALIEN SHIPS.`;
        this.storyPart3 = `YOU ARE HUMANITY'S LAST HOPE`;

        // Create sprites
        this.ai = this.add.sprite(0, 0, 'ai').setOrigin(0);
        this.evogi = this.add.sprite(0, 0, 'evogi').setOrigin(0).setAlpha(0);
        this.trump = this.physics.add.sprite(0, 0, 'trump').setAlpha(0); // Position set in resize
        this.ship = this.physics.add.sprite(0, 0, 'ship').setAlpha(0); // Position set in resize

        // Create animations (ensure keys are unique if other scenes use same assets)
        this.anims.create({ key: 'ai_default_red_example', frames: this.anims.generateFrameNumbers('ai-red', { frames: [0, 6] }), frameRate: 2, repeat: -1 });
        this.anims.create({ key: 'ai_default_blue_example', frames: this.anims.generateFrameNumbers('ai', { frames: [0, 6] }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'evogi.default_example', frames: this.anims.generateFrameNumbers('evogi', { start: 0, end: 17 }), frameRate: 9, repeat: 4 }); // Make it play once
        this.anims.create({ key: 'trump_default_example', frames: this.anims.generateFrameNumbers('trump', { frames: [1, 2] }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'ship_default_example', frames: this.anims.generateFrameNumbers('ship', { frames: [1, 2] }), frameRate: 8, repeat: -1 });

        // Trump tween
        this.trumpTween = this.tweens.add({ targets: this.trump, y: '-=20', ease: 'Sine.easeInOut', duration: 4000, repeat: -1, yoyo: true, paused: true });

        // Bottom text area background
        this.textAreaBg = this.add.graphics(); // Position/size set in resize

        // Story text display
        this.storyText = this.add.bitmapText(0, 0, 'font', '', 16); // Position/maxWidth set in resize

        // Buttons (position set in resize)
        this.nextButton = this.add.image(0, 0, 'button').setInteractive({ useHandCursor: true }).setVisible(false);
        this.nextButton.on('pointerdown', () => { this.typeWriterText(this.storyPart2); this.nextButton.setVisible(false); });

        this.nextButton2 = this.add.image(0, 0, 'button').setInteractive({ useHandCursor: true }).setVisible(false);
        this.nextButton2.on('pointerdown', () => { this.typeWriterText(this.storyPart3); this.nextButton2.setVisible(false); });

        // Initialize the video object placeholder
        this.outroVideo = null;

        // Initial layout and start story
        this.resizeScene(this.currentWidth, this.currentHeight); // Call initial layout
        this.typeWriterText(this.storyPart1);
    }

    typeWriterText(text) {
        // Reset visuals based on story part
         this.tweens.killTweensOf([this.ai, this.trump, this.ship, this.evogi]); // Stop ongoing fades/effects
         this.trumpTween?.pause().seek(0); // Stop and reset tween
         this.cameras.main.resetFX(); // Stop any previous camera effects (like shake)
         this.ai?.setAlpha(1).setRotation(0).setScale(1); // Reset AI visual state

         // Cleanup previous video if exists
         if (this.outroVideo) {
             this.outroVideo.destroy();
             this.outroVideo = null;
         }

        if (text === this.storyPart1) {
            this.ai?.setAlpha(1).play('ai_default_red_example');
            this.evogi?.setAlpha(0).setVisible(true); // Ensure evogi is visible but transparent initially
            this.trump?.setAlpha(0);
            this.ship?.setAlpha(0);
        } else if (text === this.storyPart2) {
            this.ai?.setAlpha(1).play('ai_default_blue_example');
            this.evogi?.setAlpha(0).setVisible(true);
            this.ship?.setAlpha(0);
             this.tweens.add({ targets: this.trump, alpha: { from: 0, to: 1 }, duration: 1000, onComplete: () => { this.trump?.play('trump_default_example'); this.trumpTween?.resume(); } });
        } else if (text === this.storyPart3) {
             this.tweens.add({ targets: [this.ai, this.trump], alpha: { from: 1, to: 0 }, duration: 500,
                 onComplete: () => {
                      this.tweens.add({ targets: this.ship, alpha: { from: 0, to: 1 }, duration: 750,
                          onComplete: () => {
                               this.ship?.play('ship_default_example');
                               this.tweens.add({ targets: this.ship, alpha: { from: 1, to: 0 }, duration: 500, delay: 1000,
                                   onComplete: () => {
                                        this.evogi?.setPosition(0, 0).setAlpha(1); // Make evogi visible before animation
                                        this.evogi?.play('evogi.default_example');

                                        // --- Add listener for animation completion ---
                                        this.evogi?.once(Phaser.Animations.Events.ANIMATION_REPEAT, () => {
                                             console.log("Evogi animation complete. Starting takeover sequence.");
                                             this.startTakeoverSequence();
                                        });
                                        // --- ---
                                   }
                               });
                          }
                      });
                 }
             });
        }

        // Typewriter effect
        let i = 0;
        if (!this.storyText || !this.storyText.active) return; // Guard
        this.storyText.text = '';
        if (this.typewriterTimer) this.typewriterTimer.remove();

        this.typewriterTimer = this.time.addEvent({
            callback: () => {
                 if (!this.storyText || !this.storyText.active) { // Double check existence
                      if(this.typewriterTimer) this.typewriterTimer.remove(); // Stop if destroyed
                      return;
                 }
                this.storyText.text += text[i];
                ++i;
                if (i === text.length) {
                    if (text === this.storyPart1) this.nextButton?.setVisible(true);
                    else if (text === this.storyPart2) this.nextButton2?.setVisible(true);
                    // Final state: No button action needed here (takeover sequence handles it)
                }
            },
            repeat: text.length - 1,
            delay: 50 // Faster typing
        });
    }

    startTakeoverSequence() {
         // 1. Fade Out Evogi Sprite concurrently with shake
         if (this.evogi && this.evogi.active) {
             this.tweens.add({
                 targets: this.evogi,
                 alpha: { from: 1, to: 0 },
                 duration: 1500, // Match shake duration
                 ease: 'Power2',
                 onComplete: () => {
                     this.evogi.setVisible(false); // Ensure it's hidden after fade
                 }
             });
         }

         // 2. Play Video
         if (this.cache.video.has('evogi-outro')) {
              // Remove previous video if exists
              if (this.outroVideo) this.outroVideo.destroy();

              this.outroVideo = this.add.video(this.currentWidth / 2, this.currentHeight / 2, 'evogi-outro');
               this.outroVideo.setOrigin(0.5, 0.5);
               this.outroVideo.setAlpha(0); // Start transparent

               // Scale video to FIT the screen dimensions while maintaining aspect ratio
               // This ensures it fits within the currentWidth/currentHeight (e.g., 360x640 initially)
               const scaleX = this.currentWidth / this.outroVideo.width;
               const scaleY = this.currentHeight / this.outroVideo.height;
               this.outroVideo.setScale(Math.min(scaleX, scaleY)); // Fit screen aspect ratio

              this.outroVideo.play(true); // Play video (no loop)
               console.log("Playing outro video");

              // Fade in the video sync with shake (target alpha 0.45)
              this.tweens.add({
                  targets: this.outroVideo,
                  alpha: { from: 0, to: 0.45 }, // Changed target alpha
                  duration: 1500, // Match shake duration
                  ease: 'Linear' // Simple fade
              });

              // Add subtle position and rotation tweens to video during shake
              this.tweens.add({
                  targets: this.outroVideo,
                  x: `+=${Phaser.Math.Between(-5, 5)}`, // Small random horizontal shift
                  y: `+=${Phaser.Math.Between(-5, 5)}`, // Small random vertical shift
                  duration: 250, // Short duration for wobble effect
                  ease: 'Sine.easeInOut',
                  yoyo: true,
                  repeat: 5 // Repeat during the 1500ms shake
              });
               this.tweens.add({
                  targets: this.outroVideo,
                  angle: { from: Phaser.Math.Between(-1, 1), to: Phaser.Math.Between(-1, 1) }, // Small random rotation wobble
                  duration: 300, // Short duration
                  ease: 'Sine.easeInOut',
                  yoyo: true,
                  repeat: 4 // Repeat during the 1500ms shake
              });


              this.outroVideo.on('complete', () => {
                   console.log("Outro video complete.");
                   // Optional: Add logic here for after the video finishes
                   // e.g., transition to another scene or show a final message
                   if (this.outroVideo) this.outroVideo.setVisible(false); // Hide video on complete
              }, this);

              this.outroVideo.on('error', (video, error) => {
                   console.error("Video playback error:", error);
                   if (this.outroVideo) this.outroVideo.setVisible(false);
              });

         } else {
             console.error("evogi-outro video not found in cache!");
         }

         // 3. Add Effects
         // Camera Shake (runs concurrently with video fade-in)
         this.cameras.main.shake(1500, 0.015); // Shake for 1.5 seconds, intensity 0.015

         // AI Background Glitch/Transform
         if (this.ai) {
              this.ai.setAlpha(1); // Ensure background is visible
             // Rotation Tween
             this.tweens.add({
                 targets: this.ai,
                 angle: { from: 0, to: Phaser.Math.Between(-10, 10) },
                 duration: 200,
                 ease: 'Sine.easeInOut',
                 yoyo: true,
                 repeat: 5 // Repeat a few times
             });
             // Alpha Flash Tween (Glitch)
             this.tweens.add({
                 targets: this.ai,
                 alpha: { from: 0.5, to: 1 },
                 duration: 50,
                 ease: 'Stepped',
                 easeParams: [2],
                 yoyo: true,
                 repeat: 15 // Repeat many times quickly
             });
              // Optional: Rapidly switch between ai and ai-red frames
              this.time.addEvent({
                   delay: 75,
                   repeat: 20,
                   callback: () => {
                        if (this.ai && this.ai.active) {
                             this.ai.setTexture(Phaser.Math.RND.pick(['ai', 'ai-red']));
                        }
                   }
              });
         }
    }

    // Called by EditorScene when the parent zone is dragged
    refresh ()
    {
         if (!this.parent) return;
        // Update camera position to match the dragged zone
        this.cameras.main.setPosition(this.parent.x, this.parent.y);

        // Bring this scene's display list to the top
        if (this.sys && this.sys.bringToTop) {
             this.sys.bringToTop();
        }
    }

    // Called by EditorScene for resize/fullscreen
    resizeScene(newWidth, newHeight)
    {
        this.currentWidth = newWidth;
        this.currentHeight = newHeight;

        if (!this.cameras.main) return; // Guard

        // Update camera viewport size
        this.cameras.main.setSize(newWidth, newHeight);

        // --- Re-layout elements ---
        const centerX = newWidth * 0.5;
        const centerY = newHeight * 0.5; // Added for video positioning
        const bottomAreaHeight = newHeight * 0.25;
        const bottomAreaY = newHeight - bottomAreaHeight;
        const topAreaHeight = newHeight - bottomAreaHeight; // Height of the area above text
        const topAreaCenterY = topAreaHeight * 0.5;

        // Scale backgrounds/main sprites to cover the new dimensions
        if (this.ai) this.ai.setDisplaySize(newWidth, newHeight);
        if (this.evogi) this.evogi.setDisplaySize(newWidth, topAreaHeight); // Scale evogi to top area
         if (this.evogi) this.evogi.setPosition(centerX, topAreaCenterY); // Center evogi in top area

        // Position characters in the top area
        if (this.trump) {
            this.trump.setPosition(centerX, topAreaCenterY);
            const trumpScale = Math.max(1, Math.min(2, topAreaHeight / 160)); // Scale based on top area height
            this.trump.setScale(trumpScale);
        }
        if (this.ship) {
            this.ship.setPosition(centerX, topAreaCenterY);
             const shipScale = Math.max(1, Math.min(1.5, topAreaHeight / 240)); // Scale based on top area height
             this.ship.setScale(shipScale);
        }

        // Position and scale video if it exists
        if (this.outroVideo && this.outroVideo.active) {
            this.outroVideo.setPosition(centerX, centerY); // Center video
             // Rescale video to FIT the new screen size
             const scaleX = newWidth / this.outroVideo.width;
             const scaleY = newHeight / this.outroVideo.height;
             this.outroVideo.setScale(Math.min(scaleX, scaleY)); // Fit
         }

         // Text area background
        if (this.textAreaBg) {
            this.textAreaBg.clear();
            this.textAreaBg.fillStyle(0x000000, 0.7); // Slightly transparent
            this.textAreaBg.fillRect(0, bottomAreaY, newWidth, bottomAreaHeight);
        }

        // Story text
        if (this.storyText) {
            this.storyText.setPosition(20, bottomAreaY + 20);
            this.storyText.maxWidth = newWidth - 40;
        }

        // Buttons
        const buttonY = bottomAreaY + bottomAreaHeight / 2; // Vertically center in text area
        const buttonX = newWidth - 60; // Position towards right
        if (this.nextButton) this.nextButton.setPosition(buttonX, buttonY);
        if (this.nextButton2) this.nextButton2.setPosition(buttonX, buttonY);

        console.log(`${this.scene.key} resized to ${newWidth}x${newHeight}`);
    }


    shutdown() {
         // Clean up tweens and timers
         if (this.trumpTween) this.trumpTween.destroy();
         if (this.typewriterTimer) this.typewriterTimer.remove();
         this.tweens.killTweensOf([this.ai, this.trump, this.ship, this.evogi, this.nextButton, this.nextButton2]);
         this.cameras.main.resetFX(); // Use resetFX to clear effects on shutdown

         // Stop and destroy video object
         if (this.outroVideo) {
             this.outroVideo.stop();
             this.outroVideo.destroy();
         }

         // Destroy game objects
         this.ai?.destroy();
         this.trump?.destroy();
         this.ship?.destroy();
         this.evogi?.destroy();
         this.storyText?.destroy();
         this.nextButton?.destroy();
         this.nextButton2?.destroy();
         this.textAreaBg?.destroy();


         // Nullify references
         this.ai = null;
         this.trump = null;
         this.ship = null;
         this.evogi = null;
         this.storyText = null;
         this.nextButton = null;
         this.nextButton2 = null;
         this.trumpTween = null;
         this.typewriterTimer = null;
         this.textAreaBg = null;
         this.parent = null;
         this.outroVideo = null;
    }

}

// Define static dimensions needed by EditorScene.createWindow
Example.WIDTH = 360;
Example.HEIGHT = 640;

// Add the default export statement
export default Example;