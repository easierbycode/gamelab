import { LoadScene } from "https://easierbycode.com/games/evil-invaders/load-scene.js";
import EditorScene from './EditorScene.js';
// LevelEditorScene is no longer preloaded here, it's launched by EditorScene

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
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
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        gamepad: true // Enable gamepad input globally
    }
};

const game = new Phaser.Game(config);
