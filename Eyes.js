class Eyes extends Phaser.Scene {

    constructor (handle, parent)
    {
        // In Phaser 4, the scene key is usually passed in the config,
        // but we receive it here from EditorScene.
        super({ key: handle });

        this.parent = parent; // Reference to the draggable zone/container

        this.leftPupil;
        this.rightPupil;

        this.leftTarget;
        this.rightTarget;

        this.leftBase;
        this.rightBase;

        this.mid = new Phaser.Math.Vector2();

        // Store current dimensions for relative calculations
        this.currentWidth = Eyes.WIDTH;
        this.currentHeight = Eyes.HEIGHT;
    }

    // No preload needed here as assets are loaded by EditorScene

    create ()
    {
        // Background image for the window
        this.bg = this.add.image(0, 0, 'eyesWindow').setOrigin(0);

        // Set the camera viewport to match the parent zone's size and position
        this.cameras.main.setViewport(this.parent.x, this.parent.y, this.currentWidth, this.currentHeight);
        // Ensure camera doesn't scroll with the main EditorScene camera
        this.cameras.main.setScroll(0, 0);

        // Initial placement based on original dimensions
        this.leftPupil = this.add.image(46, 92, 'eye');
        this.rightPupil = this.add.image(140, 92, 'eye');

        // Lines for tracking pointer relative to eye center
        this.leftTarget = new Phaser.Geom.Line(this.leftPupil.x, this.leftPupil.y, 0, 0);
        this.rightTarget = new Phaser.Geom.Line(this.rightPupil.x, this.rightPupil.y, 0, 0);

        // Ellipses representing the bounds of the eye sockets
        this.leftBase = new Phaser.Geom.Ellipse(this.leftPupil.x, this.leftPupil.y, 24, 40);
        this.rightBase = new Phaser.Geom.Ellipse(this.rightPupil.x, this.rightPupil.y, 24, 40);

        this.resizeScene(this.currentWidth, this.currentHeight); // Initial layout adjustment
    }

    update ()
    {
        // Calculate pointer position relative to this scene's viewport/parent zone
        // Ensure parent container reference is valid
        if (!this.parent || this.parent.x === undefined || this.parent.y === undefined) {
            return; // Cannot calculate relative pointer if parent is invalid
        }
        const pointerX = this.input.activePointer.x - this.parent.x;
        const pointerY = this.input.activePointer.y - this.parent.y;

        // Update target lines only if pupils exist
        if (this.leftTarget && this.rightTarget) {
            this.leftTarget.x2 = pointerX;
            this.leftTarget.y2 = pointerY;
            this.rightTarget.x2 = pointerX;
            this.rightTarget.y2 = pointerY;
        }

        // Update left pupil position if base and target exist
        if (this.leftBase && this.leftTarget) {
            if (this.leftBase.contains(this.leftTarget.x2, this.leftTarget.y2)) {
                this.mid.x = this.leftTarget.x2;
                this.mid.y = this.leftTarget.y2;
            } else { // Pointer is outside, find closest point on the ellipse edge
                Phaser.Geom.Ellipse.CircumferencePoint(this.leftBase, Phaser.Geom.Line.Angle(this.leftTarget), this.mid);
            }
            if (this.leftPupil) {
                this.leftPupil.x = this.mid.x;
                this.leftPupil.y = this.mid.y;
            }
        }

        // Repeat for the right eye if base and target exist
        if (this.rightBase && this.rightTarget) {
            if (this.rightBase.contains(this.rightTarget.x2, this.rightTarget.y2)) {
                this.mid.x = this.rightTarget.x2;
                this.mid.y = this.rightTarget.y2;
            } else {
                Phaser.Geom.Ellipse.CircumferencePoint(this.rightBase, Phaser.Geom.Line.Angle(this.rightTarget), this.mid);
            }
            if (this.rightPupil) {
                this.rightPupil.x = this.mid.x;
                this.rightPupil.y = this.mid.y;
            }
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

    // Called by EditorScene when the window is resized (fullscreen toggle)
    resizeScene(newWidth, newHeight)
    {
        this.currentWidth = newWidth;
        this.currentHeight = newHeight;

        if (!this.cameras.main) return;

        // Update the camera viewport size
        this.cameras.main.setSize(newWidth, newHeight);

        // --- Re-layout elements based on new dimensions ---
        // Scale background to fit (optional, could tile or center)
        if (this.bg) {
            this.bg.setDisplaySize(newWidth, newHeight);
        }

        // Reposition eyes relative to the new center (example layout logic)
        const centerX = newWidth / 2;
        const centerY = newHeight / 2;
        const eyeSpacing = newWidth * 0.25; // Example: Space eyes relative to width
        const eyeYPos = centerY + 10; // Example: Position slightly below center

        if (this.leftPupil && this.leftBase && this.leftTarget) {
            const leftEyeX = centerX - eyeSpacing;
            this.leftPupil.setPosition(leftEyeX, eyeYPos);
            this.leftBase.setPosition(leftEyeX, eyeYPos);
            this.leftTarget.setTo(leftEyeX, eyeYPos, this.leftTarget.x2, this.leftTarget.y2); // Update line start point
        }

        if (this.rightPupil && this.rightBase && this.rightTarget) {
            const rightEyeX = centerX + eyeSpacing;
            this.rightPupil.setPosition(rightEyeX, eyeYPos);
            this.rightBase.setPosition(rightEyeX, eyeYPos);
            this.rightTarget.setTo(rightEyeX, eyeYPos, this.rightTarget.x2, this.rightTarget.y2); // Update line start point
        }

        console.log(`${this.scene.key} resized to ${newWidth}x${newHeight}`);
    }
}

// Define static properties for the original window dimensions
Eyes.WIDTH = 183;
Eyes.HEIGHT = 162;

export default Eyes;