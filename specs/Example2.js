class Example2 extends Phaser.Scene {
    constructor() {
        super();
    }

    preload() {
        this.load.image('logo', `https://play.rosebud.ai/assets/logo.png?j9ze`);
        this.load.spritesheet('stars', 'https://play.rosebud.ai/assets/stars-bw.png?sOck', { frameWidth: 8, frameHeight: 8 });
    }

    create() {
        this.points = [];
        this.stars = this.add.group();
        this.maxDepth = 32;

        for (var i = 0; i < 384; i++) {
            this.points.push({
                x: Phaser.Math.Between(-25, 25),
                y: Phaser.Math.Between(-25, 25),
                z: Phaser.Math.Between(1, this.maxDepth)
            });
        }

        this.logo = this.physics.add.image(this.game.config.width / 2, 100, 'logo');
    }

    update() {
        this.stars.clear(true, true);
        for (var i = 0; i < this.points.length; i++) {
            var point = this.points[i];

            point.z -= 0.2;

            if (point.z <= 0) {
                point.x = Phaser.Math.Between(-25, 25);
                point.y = Phaser.Math.Between(-25, 25);
                point.z = this.maxDepth;
            }

            var px = point.x * (128 / point.z) + (this.game.config.width * 0.5);
            var py = point.y * (128 / point.z) + (this.game.config.height * 0.5);

            var star = this.physics.add.sprite(px, py, 'stars', Phaser.Math.Between(0, 5));
            star.setDepth((1 - point.z / 32) * 2);
            star.setAlpha((1 - point.z / 32));

            star.setScale((1 - point.z / 32) * 1.15);

            this.stars.add(star);
        }
    }
}

// Define static dimensions needed by EditorScene.createWindow
Example2.WIDTH = 360;
Example2.HEIGHT = 640;

// Add the default export statement
export default Example2;