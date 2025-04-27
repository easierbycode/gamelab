Feature Request: CMS for Vertical Shmup games using Phaser 4 RC2
> Models; o3-mini, o4-mini, o3
>
> Implement every detail below end to end and validate your work with tests.
> to show changes do not `open index.html`, vite should already be running

## Implementation Notes
- Dazaemon 2 clone.  A Shmup builder which offers player, enemy, map, enemy layout, explosion, and projectile editors
- 16x16 tiles are created in the pixel editor, and used individually or joined in containers to form all characters and maps
- After you implement a user facing feature, run browser test that verifies FPS >= 60, and update USER_GUIDE.txt with concise understandable user instructions
- scenes are created in draggable windows
  - each window should have a 28x20 virtual hit input in the upper left which closes it when clicked

## Relevant Files (Context)
> Read these files before implementing the feature.
README.md

## Self Validation (Close the loop)
> After implementing the feature, create tests to verify it works. 
