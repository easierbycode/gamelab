class Example3 extends Phaser.Scene {
    constructor(handle, parent) { // Add handle and parent parameters
        super({ key: handle }); // Use handle for scene key
        this.parent = parent; // Store parent container reference

        // Initialize properties
        this.logo = null;
        this.emitter = null;
        this.bg = null; // Optional background

        // Store current dimensions
        this.currentWidth = Example3.WIDTH;
        this.currentHeight = Example3.HEIGHT;
    }

    preload() {
        // Assets should ideally be loaded globally by LoadScene or EditorScene
        // Keeping them here for demonstration, but remove if loaded elsewhere.
        this.load.image('logo', `https://play.rosebud.ai/assets/logo.png?sVKv`); // Redundant if loaded elsewhere
        this.load.image('particle', 'https://play.rosebud.ai/assets/particle.png?Wslm');
        this.load.spritesheet('clownCar', `https://play.rosebud.ai/assets/clown-car.png?JB1F`, { frameWidth: 64, frameHeight: 92 });
        // Load a window background if desired
        // this.load.image('example3Window', 'path/to/your/window/bg.png');
    }

    lightning() {
        // Ensure camera exists before applying effects
        if (!this.cameras.main) return;
        // Use hex color codes directly
        this.cameras.main.setBackgroundColor(0xabf2ea);
        this.cameras.main.flash(17, 0x000000);
        this.time.delayedCall(1, () => this.cameras.main?.setBackgroundColor(0xfefbff));
        this.time.delayedCall(16, () => this.cameras.main?.flash(34, 0xfefbff));
        this.time.delayedCall(16 * 2, () => this.cameras.main?.setBackgroundColor(0xfefbff));
        this.time.delayedCall(16 * 3, () => this.cameras.main?.setBackgroundColor(0x9fa3c4));
        this.time.delayedCall(64, () => this.cameras.main?.setBackgroundColor(0x7d81a2));
        this.time.delayedCall(64 + 80, () => {
             if(this.cameras.main) {
                  this.cameras.main.setBackgroundColor(0x5d6081);
                  this.cameras.main.flash(1, 0x000000, true, () => { this.cameras.main?.shake(17, 0.0035); });
             }
        });
        this.time.delayedCall(64 + (80 * 2), () => this.cameras.main?.setBackgroundColor(0x3c4061));
        this.time.delayedCall(64 + (80 * 3), () => this.cameras.main?.setBackgroundColor(0x000000));
    }

    create() {
         // Set viewport/camera based on parent container passed from EditorScene
         if (this.parent) {
              this.cameras.main.setViewport(this.parent.x, this.parent.y, this.currentWidth, this.currentHeight);
              // Set initial background color for the scene (before lightning effect)
              this.cameras.main.setBackgroundColor(0x000000);
              this.cameras.main.setScroll(0, 0);
               // Optional: Add a background frame image if loaded
               // this.bg = this.add.image(0, 0, 'example3Window').setOrigin(0);
         } else {
              // Fallback if no parent (e.g., running standalone)
              this.cameras.main.setBackgroundColor(0x000000);
         }

        this.physics.world.setBounds(0, 0, this.currentWidth, this.currentHeight, true, true, false, false);

        const colors = [0xffbb33, 0xd4af37, 0xfcdb06, 0xeeaa00, 0xeecc66, 0xff0000];
        let emitterConfig = {
            speed: 100,
            scale: { start: 1.5, end: 0 },
            blendMode: 'ADD',
            tint: {
                onUpdate: (particle, key, value) => {
                    return Phaser.Utils.Array.GetRandom(colors);
                }
            },
            frequency: 10
        };
        // Create emitter using the new syntax: scene.add.particles(x, y, texture, config)
        this.emitter = this.add.particles(0, 0, 'particle', emitterConfig);

        this.logo = this.physics.add.sprite(this.currentWidth / 2, this.currentHeight * 0.38, 'clownCar').setFlipX(true).setScale(2).setOrigin(0.5, 0.95);
        this.logo.anims.create({
            key: 'default',
            frames: this.anims.generateFrameNumbers('clownCar', { start: 1, end: 2 }),
            frameRate: 4,
            repeat: -1
        });
        this.logo.play('default');

        this.tweens.add({
            targets: this.logo,
            y: this.logo.y - 10,
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        this.logo.setVelocity(20, 0);
        this.logo.setBounce(1);
        this.logo.body.setCollideWorldBounds(true, -1, 0, true);

        // Use 'worldbounds' event from the physics world
        this.physics.world.on('worldbounds', (body, up, down, left, right) => {
             // Check if the colliding body is our logo's body
             if (body === this.logo.body) {
                 if (left || right) {
                     this.logo.flipX = !this.logo.flipX;
                     // Ensure velocity exists before trying to access it
                     if (this.logo.body.velocity) {
                          this.logo.setVelocityX(-this.logo.body.velocity.x);
                     }
                 }
             }
        });


        this.emitter.startFollow(this.logo);

        // Flash camera after 8 seconds
        this.time.addEvent({
            delay: 8000,
            callback: () => {
                this.lightning();
                this.time.delayedCall(1300, () => this.lightning());
            },
            loop: true // Use loop: true instead of repeat: -1
        });

        // Disable world bounds and make logo appear to move away from the camera after 21 seconds
        this.time.addEvent({
            delay: 21000,
            callback: () => {
                if (!this.physics.world) return; // Guard
                this.physics.world.setBoundsCollision(false, false, false, false);
                if (!this.logo || !this.logo.active) return; // Guard logo
                this.tweens.add({
                    targets: this.logo,
                    scale: 1.25,
                    alpha: 0.8,
                    duration: 3000,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                         if (!this.logo || !this.logo.active) return; // Guard logo again
                        this.tweens.add({
                            targets: this.logo,
                            scale: 8,
                            alpha: 1,
                            y: -400,
                            duration: 3000,
                            ease: 'Sine.easeInOut',
                            onComplete: () => {
                                if (this.emitter) this.emitter.destroy();
                                this.emitter = null; // Clear reference
                            }
                        });
                    }
                });
            }
        });
    }

    update() {
        // Synchronize emitter alpha with logo alpha if both exist
        if (this.emitter && this.emitter.active && this.logo && this.logo.active) {
             this.emitter.setAlpha(this.logo.alpha);
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

        // Scale background if it exists
        if (this.bg) {
            this.bg.setDisplaySize(newWidth, newHeight);
        }

        // Update physics bounds
        if (this.physics.world) {
             this.physics.world.setBounds(0, 0, newWidth, newHeight);
        }

        // Reposition logo (e.g., maintain relative position)
        if (this.logo && this.logo.body) {
            this.logo.setPosition(newWidth / 2, newHeight * 0.38);
             this.logo.body.setCollideWorldBounds(true); // Re-apply world bounds
        }

        // Emitter position updates automatically via startFollow

        console.log(`${this.scene.key} resized to ${newWidth}x${newHeight}`);
    }

     shutdown() {
         // Stop all tweens targeting scene objects
         if (this.logo) this.tweens.killTweensOf(this.logo);

         // Remove timers and event listeners
         this.time.removeAllEvents();
         this.physics.world?.off('worldbounds'); // Remove specific listener

         // Destroy game objects
         this.logo?.destroy();
         this.emitter?.destroy();
         this.bg?.destroy();

         // Nullify references
         this.logo = null;
         this.emitter = null;
         this.parent = null;
         this.bg = null;
     }
}

// Define static dimensions needed by EditorScene.createWindow
Example3.WIDTH = 360;
Example3.HEIGHT = 640;

// Add the default export statement
export default Example3;