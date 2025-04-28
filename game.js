import { LoadScene } from "https://codepen.io/CodeMonkeyGames/pen/LYKayQE.js";
import EditorScene from './EditorScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // No gravity needed for a top-down shooter
            debug: false // Set to true to see physics bodies
        }
    },
    scene: [LoadScene, EditorScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        gamepad: true // Enable gamepad input
    }
};

const game = new Phaser.Game(config);
