class Eyes extends Phaser.Scene {

    constructor (handle, parent)
    {
        // In Phaser 4, the scene key is usually passed in the config,
        // but we receive it here from EditorScene.
        super({ key: handle });

        this.parent = parent; // Reference to the draggable zone

        this.leftPupil;
        this.rightPupil;

        this.leftTarget;
        this.rightTarget;

        this.leftBase;
        this.rightBase;

        this.mid = new Phaser.Math.Vector2();
    }

    // No preload needed here as assets are loaded by EditorScene

    create ()
    {
        // Background image for the window
        this.add.image(0, 0, 'eyesWindow').setOrigin(0);

        // Set the camera viewport to match the parent zone's size and position
        // Note: Phaser 4 camera management might differ slightly. Verify if setViewport works as expected.
        this.cameras.main.setViewport(this.parent.x, this.parent.y, Eyes.WIDTH, Eyes.HEIGHT);
        // Ensure camera doesn't scroll with the main EditorScene camera
        this.cameras.main.setScroll(0, 0);


        this.leftPupil = this.add.image(46, 92, 'eye');
        this.rightPupil = this.add.image(140, 92, 'eye');

        // Lines for tracking pointer relative to eye center
        this.leftTarget = new Phaser.Geom.Line(this.leftPupil.x, this.leftPupil.y, 0, 0);
        this.rightTarget = new Phaser.Geom.Line(this.rightPupil.x, this.rightPupil.y, 0, 0);

        // Ellipses representing the bounds of the eye sockets
        this.leftBase = new Phaser.Geom.Ellipse(this.leftPupil.x, this.leftPupil.y, 24, 40);
        this.rightBase = new Phaser.Geom.Ellipse(this.rightPupil.x, this.rightPupil.y, 24, 40);
    }

    update ()
    {
        // Calculate pointer position relative to this scene's viewport/parent zone
        const pointerX = this.input.activePointer.x - this.parent.x;
        const pointerY = this.input.activePointer.y - this.parent.y;

        this.leftTarget.x2 = pointerX;
        this.leftTarget.y2 = pointerY;

        // Check if pointer is within the left eye socket bounds
        if (this.leftBase.contains(this.leftTarget.x2, this.leftTarget.y2))
        {
            this.mid.x = this.leftTarget.x2;
            this.mid.y = this.leftTarget.y2;
        }
        else // Pointer is outside, find closest point on the ellipse edge
        {
            Phaser.Geom.Ellipse.CircumferencePoint(this.leftBase, Phaser.Geom.Line.Angle(this.leftTarget), this.mid);
        }

        // Update left pupil position
        this.leftPupil.x = this.mid.x;
        this.leftPupil.y = this.mid.y;

        // Repeat for the right eye
        this.rightTarget.x2 = pointerX;
        this.rightTarget.y2 = pointerY;

        if (this.rightBase.contains(this.rightTarget.x2, this.rightTarget.y2))
        {
            this.mid.x = this.rightTarget.x2;
            this.mid.y = this.rightTarget.y2;
        }
        else
        {
            Phaser.Geom.Ellipse.CircumferencePoint(this.rightBase, Phaser.Geom.Line.Angle(this.rightTarget), this.mid);
        }

        this.rightPupil.x = this.mid.x;
        this.rightPupil.y = this.mid.y;
    }

    // Called by EditorScene when the parent zone is dragged
    refresh ()
    {
        // Update camera position to match the dragged zone
        this.cameras.main.setPosition(this.parent.x, this.parent.y);

        // Bring this scene's display list to the top
        // In Phaser 4, scene order might be managed differently.
        // this.scene.bringToTop() might not be the exact method,
        // but the intent is to ensure this window appears above others.
        // We might need to manage scene depth/order in EditorScene instead.
        // For now, keep the intent. Check P4 docs if rendering issues occur.
        if (this.scene.bringToTop) {
             this.scene.bringToTop();
        } else if (this.sys && this.sys.bringToTop) {
             this.sys.bringToTop(); // Phaser 3 style fallback
        }
    }
}

// Define static properties for the window dimensions
Eyes.WIDTH = 183;
Eyes.HEIGHT = 162;

export default Eyes;
