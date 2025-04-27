class Clock extends Phaser.Scene {

    constructor (handle, parent)
    {
        // Pass the scene key to the Phaser.Scene constructor
        super({ key: handle });

        // Store reference to the parent zone
        this.parent = parent;

        // Properties for the clock
        this.graphics;
        this.clockSize = 120;
    }

    create ()
    {
        // Add the window background image
        const bg = this.add.image(0, 0, 'clockWindow').setOrigin(0);

        // Set camera viewport to match the parent zone's position and dimensions
        this.cameras.main.setViewport(this.parent.x, this.parent.y, Clock.WIDTH, Clock.HEIGHT);
        this.cameras.main.setBackgroundColor(0x0055aa);
        // Ensure camera doesn't scroll with the main scene
        this.cameras.main.setScroll(0, 0);

        // Create a graphics object for drawing the clock hands
        this.graphics = this.add.graphics();
    }

    update ()
    {
        const graphics = this.graphics;
        const clockSize = this.clockSize;
        const x = Clock.WIDTH / 2;
        const y = 8 + Clock.HEIGHT / 2;

        // Clear previous frame's drawing
        graphics.clear();

        //  Draw the clock face
        graphics.fillStyle(0xffffff, 1);
        graphics.lineStyle(3, 0x000000, 1);
        graphics.fillCircle(x, y, clockSize);
        graphics.strokeCircle(x, y, clockSize);

        // Get current time
        let date = new Date;
        let seconds = date.getSeconds() / 60;
        let mins = date.getMinutes() / 60;
        let hours = date.getHours() / 24;

        // Set size for the clock hands (90% of clock size)
        let size = clockSize * 0.9;

        // Draw hours hand (black)
        let angle = (360 * hours) - 90;
        let dest = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle), size);

        graphics.fillStyle(0x000000, 1);
        graphics.beginPath();
        graphics.moveTo(x, y);

        // Create triangular hand shape
        let p1 = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle - 5), size * 0.7);
        graphics.lineTo(p1.x, p1.y);
        graphics.lineTo(dest.x, dest.y);
        graphics.moveTo(x, y);

        let p2 = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle + 5), size * 0.7);
        graphics.lineTo(p2.x, p2.y);
        graphics.lineTo(dest.x, dest.y);

        graphics.fillPath();
        graphics.closePath();

        // Draw minutes hand (black)
        angle = (360 * mins) - 90;
        dest = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle), size);

        graphics.fillStyle(0x000000, 1);
        graphics.beginPath();
        graphics.moveTo(x, y);

        p1 = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle - 5), size * 0.7);
        graphics.lineTo(p1.x, p1.y);
        graphics.lineTo(dest.x, dest.y);
        graphics.moveTo(x, y);

        p2 = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle + 5), size * 0.7);
        graphics.lineTo(p2.x, p2.y);
        graphics.lineTo(dest.x, dest.y);

        graphics.fillPath();
        graphics.closePath();

        // Draw seconds hand (red)
        angle = (360 * seconds) - 90;
        dest = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle), size);

        graphics.fillStyle(0xff0000, 1);
        graphics.beginPath();
        graphics.moveTo(x, y);

        // Thinner seconds hand
        p1 = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle - 5), size * 0.3);
        graphics.lineTo(p1.x, p1.y);
        graphics.lineTo(dest.x, dest.y);
        graphics.moveTo(x, y);

        p2 = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle + 5), size * 0.3);
        graphics.lineTo(p2.x, p2.y);
        graphics.lineTo(dest.x, dest.y);

        graphics.fillPath();
        graphics.closePath();
    }

    // Called by EditorScene when the parent zone is dragged
    refresh ()
    {
        // Update camera position to match the parent zone
        this.cameras.main.setPosition(this.parent.x, this.parent.y);

        // Bring this scene to the top of the display list
        // Note: Check if Phaser 4 has different scene management
        if (this.scene.bringToTop) {
            this.scene.bringToTop();
        } else if (this.sys && this.sys.bringToTop) {
            this.sys.bringToTop(); // Phaser 3 style fallback
        }
    }
}

// Define static dimensions for use in EditorScene
Clock.WIDTH = 275;
Clock.HEIGHT = 276;

export default Clock;
