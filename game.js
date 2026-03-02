import { LoadScene } from "http://easierbycode.com/games/evil-invaders/load-scene.js";
import EditorScene from './EditorScene.js';
// LevelEditorScene is no longer preloaded here, it's launched by EditorScene

const config = {
    type: Phaser.AUTO,
    width: 800, // Main game canvas width
    height: 600, // Main game canvas height
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [LoadScene, EditorScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        gamepad: true // Enable gamepad input globally
    }
};

const game = new Phaser.Game(config);
