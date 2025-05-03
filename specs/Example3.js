class Example3 extends Phaser.Scene {
    constructor() {
        super();
    }

    preload() {
        this.load.image('logo', `https://play.rosebud.ai/assets/logo.png?sVKv`);
        this.load.image('particle', 'https://play.rosebud.ai/assets/particle.png?Wslm');
        this.load.spritesheet('clownCar', `https://play.rosebud.ai/assets/clown-car.png?JB1F`, { frameWidth: 64, frameHeight: 92 });
    }

    lightning() {
        this.cameras.main.setBackgroundColor(0xab, 0xf2, 0xea);  // flash color 0xabf2ea
        this.cameras.main.flash(17, 0x00, 0x00, 0x00);
        this.time.delayedCall(1, () => this.cameras.main.setBackgroundColor(0xfe, 0xfb, 0xff));
        this.time.delayedCall(16, () => this.cameras.main.flash(34, 0xfe, 0xfb, 0xff));
        this.time.delayedCall(16 * 2, () => this.cameras.main.setBackgroundColor(0xfe, 0xfb, 0xff));
        this.time.delayedCall(16 * 3, () => this.cameras.main.setBackgroundColor(0x9f, 0xa3, 0xc4));
        this.time.delayedCall(64, () => this.cameras.main.setBackgroundColor(0x7d, 0x81, 0xa2));
        this.time.delayedCall(64 + 80, () => this.cameras.main.setBackgroundColor(0x5d, 0x60, 0x81) && this.cameras.main.flash(1, 0x00, 0x00, 0x00, true, () => { this.cameras.main.shake(17, 0.0035) }));
        this.time.delayedCall(64 + (80 * 2), () => this.cameras.main.setBackgroundColor(0x3c, 0x40, 0x61));
        this.time.delayedCall(64 + (80 * 3), () => this.cameras.main.setBackgroundColor(0x00, 0x00, 0x00));
    }

    create() {
        this.physics.world.setBounds(0, 0, 360, 640, true, true, false, false);

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
        // x, y are initial position (can be 0,0 if using startFollow)
        const emitter = this.add.particles(0, 0, 'particle', emitterConfig);

        const logo = this.physics.add.sprite(180, 242, 'clownCar').setFlipX(true).setScale(2).setOrigin(0.5, 0.95);
        logo.anims.create({
            key: 'default',
            frames: this.anims.generateFrameNumbers('clownCar', { start: 1, end: 2 }),
            frameRate: 4,
            repeat: -1
        });
        logo.play('default');

        this.tweens.add({
            targets: logo,
            y: logo.y - 10,
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        logo.setVelocity(20, 0);
        logo.setBounce(1);
        logo.body.setCollideWorldBounds(true, -1, 0, true);
        this.physics.world.on(
            'worldbounds',
            (body, up, down, left, right) => {
                if (left || right) {
                    logo.flipX = !logo.flipX;
                    logo.setVelocityX(-logo.body.velocity.x);
                }
            }
        );

        emitter.startFollow(logo);

        // Flash camera after 8 seconds
        this.time.addEvent({
            delay: 8000,
            callback: () => {
                this.lightning();
                this.time.delayedCall(1300, () => this.lightning());
            },
            repeat: -1
        });

        // Disable world bounds and make logo appear to move away from the camera after 21 seconds
        this.time.addEvent({
            delay: 21000,
            callback: () => {
                this.physics.world.setBoundsCollision(false, false, false, false);
                this.tweens.add({
                    targets: logo,
                    scale: 1.25,
                    alpha: 0.8,
                    duration: 3000,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: logo,
                            scale: 8,
                            alpha: 1,
                            y: -400,
                            duration: 3000,
                            ease: 'Sine.easeInOut',
                            onComplete: () => {
                                emitter.destroy();
                            }
                        });
                    }
                });
            }
        });

        // Store reference to logo and emitter for use in update method
        this.logo = logo;
        this.emitter = emitter;
    }

    update() {
        // Synchronize emitter alpha with logo alpha
        this.emitter.setAlpha(this.logo.alpha);
    }
}

// Define static dimensions needed by EditorScene.createWindow
Example3.WIDTH = 360;
Example3.HEIGHT = 640;

// Add the default export statement
export default Example3;