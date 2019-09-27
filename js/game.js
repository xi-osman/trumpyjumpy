/**
 * Constants used in this game.
 */
var Colors = {
	cherry: 0xe35d6a,
	blue: 0x1560bd,
	white: 0xd8d0d1,
	black: 0x000000,
	brown: 0x59332e,
	peach: 0xffdab9,
	yellow: 0xffff00,
	olive: 0x556b2f,
	grey: 0x696969,
	sand: 0xc2b280,
	brownDark: 0x23190f,
	green: 0x669900,
};

var deg2Rad = Math.PI / 180;

// Make a new world when the page is loaded.
window.addEventListener('load', function () {
	new World();
});

/** 
  * A class of which the world is an instance. Initializes the game
  * and contains the main game loop.
  *
  */
function World() {

	// Explicit binding of this even in changing contexts.
	var self = this;

	// Scoped variables in this world.
	var element, scene, camera, character, renderer, light,
		objects, paused, keysAllowed, score, difficulty,
		treePresenceProb, maxTreeSize, fogDistance, gameOver;

	// Initialize the world.
	init();

	/**
	  * Builds the renderer, scene, lights, camera, and the character,
	  * then begins the rendering loop.
	  */
	async function init() {

		// Locate where the world is to be located on the screen.
		element = document.getElementById('world');

		// Initialize the renderer.
		renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true
		});
		renderer.setSize(element.clientWidth, element.clientHeight);
		renderer.shadowMap.enabled = true;
		element.appendChild(renderer.domElement);

		// Initialize the scene.
		scene = new THREE.Scene();
		fogDistance = 40000;
		scene.fog = new THREE.Fog(0xbadbe4, 1, fogDistance);

		// Initialize the camera with field of view, aspect ratio,
		// near plane, and far plane.
		camera = new THREE.PerspectiveCamera(
			68, element.clientWidth / element.clientHeight, 1, 120000);
		camera.position.set(0, 1500, -2000);
		camera.lookAt(new THREE.Vector3(0, 600, -5000));
		window.camera = camera;

		// Set up resizing capabilities.
		window.addEventListener('resize', handleWindowResize, false);

		// Initialize the lights.
		light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
		scene.add(light);

		// Initialize the character and add it to the scene.
		character = await new Character();
		scene.add(character.element)

		var ground = createBox(3000, 20, 120000, Colors.sand, 0, -400, -60000);
		scene.add(ground);

		objects = [];
		treePresenceProb = 0.2;
		maxTreeSize = 0.5;
		for (var i = 10; i < 40; i++) {
			createRowOfTrees(i * -3000, treePresenceProb, 0.5, maxTreeSize);
		}

		// The game is paused to begin with and the game is not over.
		gameOver = false;
		paused = true;

		// Start receiving feedback from the player.
		var left = 37;
		var up = 38;
		var right = 39;
		var p = 80;

		keysAllowed = {};
		/// Support Touch 
		var mc = new Hammer(element);

		//enable all directions
		mc.get('swipe').set({
			direction: Hammer.DIRECTION_ALL,
			threshold: 1, 
			velocity:0.1
		});

		// listen to events...
		mc.on("swipeup swipedown swipeleft swiperight doubletap", function(ev) {
		console.log(paused && !collisionsDetected() && swipe == 'doubletap')
			var swipe = ev.type;
			if (paused && !collisionsDetected() && swipe == 'doubletap') {
				paused = false;
				character.onUnpause();
				document.getElementById(
					"variable-content").style.visibility = "hidden";
				document.getElementById(
					"controls").style.display = "none";
			} else {
				if (swipe == 'doubletap') {
					paused = true;
					character.onPause();
					document.getElementById(
						"variable-content").style.visibility = "visible";
					document.getElementById(
						"variable-content").innerHTML =
						"Game is paused. Press any key to resume.";
				}
				if (swipe == 'swipeup' && !paused) {
					character.onUpKeyPressed();
				}
				if (swipe == 'swipeleft' && !paused) {
					character.onLeftKeyPressed();
				}
				if (swipe == 'swiperight' && !paused) {
					character.onRightKeyPressed();
				}
			}		
		});
		document.addEventListener(
			'keydown',
			function (e) {
				if (!gameOver) {
					var key = e.keyCode;
					if (keysAllowed[key] === false) return;
					keysAllowed[key] = false;
					if (paused && !collisionsDetected() && key > 18) {
						paused = false;
						character.onUnpause();
						document.getElementById(
							"variable-content").style.visibility = "hidden";
						document.getElementById(
							"controls").style.display = "none";
					} else {
						if (key == p) {
							paused = true;
							character.onPause();
							document.getElementById(
								"variable-content").style.visibility = "visible";
							document.getElementById(
								"variable-content").innerHTML =
								"Game is paused. Press any key to resume.";
						}
						if (key == up && !paused) {
							character.onUpKeyPressed();
						}
						if (key == left && !paused) {
							character.onLeftKeyPressed();
						}
						if (key == right && !paused) {
							character.onRightKeyPressed();
						}
					}
				}
			}
		);
		document.addEventListener(
			'keyup',
			function (e) {
				keysAllowed[e.keyCode] = true;
			}
		);
		document.addEventListener(
			'focus',
			function (e) {
				keysAllowed = {};
			}
		);

		// Initialize the scores and difficulty.
		score = 0;
		difficulty = 0;
		document.getElementById("score").innerHTML = score;

		// Begin the rendering loop.
		loop();

	}

	/**
	  * The main animation loop.
	  */
	function loop() {

		// Update the game.
		if (!paused) {

			// Add more trees and increase the difficulty.
			if ((objects[objects.length - 1].mesh.position.z) % 3000 == 0) {
				difficulty += 1;
				var levelLength = 30;
				if (difficulty % levelLength == 0) {
					var level = difficulty / levelLength;
					switch (level) {
						case 1:
							treePresenceProb = 0.35;
							maxTreeSize = 0.5;
							break;
						case 2:
							treePresenceProb = 0.35;
							maxTreeSize = 0.85;
							break;
						case 3:
							treePresenceProb = 0.5;
							maxTreeSize = 0.85;
							break;
						case 4:
							treePresenceProb = 0.5;
							maxTreeSize = 1.1;
							break;
						case 5:
							treePresenceProb = 0.5;
							maxTreeSize = 1.1;
							break;
						case 6:
							treePresenceProb = 0.55;
							maxTreeSize = 1.1;
							break;
						default:
							treePresenceProb = 0.55;
							maxTreeSize = 1.25;
					}
				}
				if ((difficulty >= 5 * levelLength && difficulty < 6 * levelLength)) {
					fogDistance -= (25000 / levelLength);
				} else if (difficulty >= 8 * levelLength && difficulty < 9 * levelLength) {
					fogDistance -= (5000 / levelLength);
				}
				createRowOfTrees(-120000, treePresenceProb, 0.5, maxTreeSize);
				scene.fog.far = fogDistance;
			}

			// Move the trees closer to the character.
			objects.forEach(function (object) {
				object.mesh.position.z += 100;
			});

			// Remove trees that are outside of the world.
			objects = objects.filter(function (object) {
				return object.mesh.position.z < 0;
			});

			// Make the character move according to the controls.
			character.update();

			// Check for collisions between the character and objects.
			if (collisionsDetected()) {
				gameOver = true;
				paused = true;
				document.addEventListener(
					'keydown',
					function (e) {
						if (e.keyCode == 40)
							document.location.reload(true);
					}
				);
				var variableContent = document.getElementById("variable-content");
				variableContent.style.visibility = "visible";
				variableContent.innerHTML =
					"Game over! Press the down arrow or double tap to try again.";
				var table = document.getElementById("ranks");
				var rankNames = ["'Believe me I can do better'", "'Fake News'", "'Tim Apple'", "'Daily Runner'",
					"'Local Prospect'", "'Regional Star'", "'National Champ'", "'Building the wall higher!'"];
				var rankIndex = Math.floor(score / 15000);

				// If applicable, display the next achievable rank.
				if (score < 124000) {
					var nextRankRow = table.insertRow(0);
					nextRankRow.insertCell(0).innerHTML = (rankIndex <= 5)
						? "".concat((rankIndex + 1) * 15, "k-", (rankIndex + 2) * 15, "k")
						: (rankIndex == 6)
							? "105k-124k"
							: "124k+";
					nextRankRow.insertCell(1).innerHTML = "*Score within this range to earn the next rank*";
				}

				// Display the achieved rank.
				var achievedRankRow = table.insertRow(0);
				achievedRankRow.insertCell(0).innerHTML = (rankIndex <= 6)
					? "".concat(rankIndex * 15, "k-", (rankIndex + 1) * 15, "k").bold()
					: (score < 124000)
						? "105k-124k".bold()
						: "124k+".bold();
				achievedRankRow.insertCell(1).innerHTML = (rankIndex <= 6)
					? "Congrats! You passed rank ".concat(rankNames[rankIndex], "!").bold()
					: (score < 124000)
						? "Congrats! You passed rank ".concat(rankNames[7], "!").bold()
						: "Congrats! You exceeded the creator's high score of 123790 and beat the game!".bold();

				// Display all ranks lower than the achieved rank.
				if (score >= 120000) {
					rankIndex = 7;
				}
				for (var i = 0; i < rankIndex; i++) {
					var row = table.insertRow(i);
					row.insertCell(0).innerHTML = "".concat(i * 15, "k-", (i + 1) * 15, "k");
					row.insertCell(1).innerHTML = rankNames[i];
				}
				if (score > 124000) {
					var row = table.insertRow(7);
					row.insertCell(0).innerHTML = "105k-124k";
					row.insertCell(1).innerHTML = rankNames[7];
				}

			}

			// Update the scores.
			score += 10;
			document.getElementById("score").innerHTML = score;

		}

		// Render the page and repeat.
		renderer.render(scene, camera);
		requestAnimationFrame(loop);
	}

	/**
	  * A method called when window is resized.
	  */
	function handleWindowResize() {
		renderer.setSize(element.clientWidth, element.clientHeight);
		camera.aspect = element.clientWidth / element.clientHeight;
		camera.updateProjectionMatrix();
	}

	/**
	 * Creates and returns a row of trees according to the specifications.
	 *
	 * @param {number} POSITION The z-position of the row of trees.
 	 * @param {number} PROBABILITY The probability that a given lane in the row
 	 *                             has a tree.
 	 * @param {number} MINSCALE The minimum size of the trees. The trees have a 
 	 *							uniformly distributed size from minScale to maxScale.
 	 * @param {number} MAXSCALE The maximum size of the trees.
 	 *
	 */
	function createRowOfTrees(position, probability, minScale, maxScale) {
		for (var lane = -1; lane < 2; lane++) {
			var randomNumber = Math.random();
			if (randomNumber < probability) {
				var scale = minScale + (maxScale - minScale) * Math.random();
				var tree = new Tree(lane * 800, -400, position, scale);
				objects.push(tree);
				scene.add(tree.mesh);
			}
		}
	}

	/**
	 * Returns true if and only if the character is currently colliding with
	 * an object on the map.
	 */
	function collisionsDetected() {
		var charMinX = character.element.position.x - 115;
		var charMaxX = character.element.position.x + 115;
		var charMinY = character.element.position.y - 310;
		var charMaxY = character.element.position.y + 320;
		var charMinZ = character.element.position.z - 40;
		var charMaxZ = character.element.position.z + 40;
		for (var i = 0; i < objects.length; i++) {
			if (objects[i].collides(charMinX, charMaxX, charMinY,
				charMaxY, charMinZ, charMaxZ)) {
				return true;
			}
		}
		return false;
	}

}

/** 
 *
 * IMPORTANT OBJECTS
 * 
 * The character and environmental objects in the game.
 *
 */

class Character
{
	clock = new THREE.Clock();
	animRun;

    constructor(){
        return (async ()=> {
			this.clock.start();
			// Character defaults that don't change throughout the game.
			this.skinColor = Colors.brown;
			this.hairColor = Colors.black;
			this.shirtColor = Colors.yellow;
			this.shortsColor = Colors.olive;
			this.jumpDuration = 0.6;
			this.jumpHeight = 2000;

			// Initialize the character.
			await this.init();

			// Initialize the player's changing parameters.
			this.isJumping = false;
			this.isSwitchingLeft = false;
			this.isSwitchingRight = false;
			this.currentLane = 0;
			this.runningStartTime = new Date() / 1000;
			this.pauseStartTime = new Date() / 1000;
			this.stepFreq = 2;
			this.queuedActions = [];

			return this
        })();
	}
	async init() {
		// Load the character.
		let promise = new Promise((resolve, reject) => {
			var loader = new THREE.FBXLoader();
			loader.load(
				"assets/Trump.fbx",
				object => {
					this.animRun = new THREE.AnimationMixer(object);
					var action = this.animRun.clipAction(object.animations[0]);
					action.play();

					object.position.set(0, -450, 0)
					var trumpPosition = new THREE.Group();
					trumpPosition.add(object)
					trumpPosition.position.z = -5000;
					this.element = trumpPosition;
					resolve();
				},
				undefined,
				function (e) {
					console.error(e);
				}
			);
		});
		await promise;
	}
	/**
	 * A method called on the character when time moves forward.
	 */
	update () {

		// Obtain the curren time for future calculations.
		var currentTime = new Date() / 1000;

		// Apply actions to the character if none are currently being
		// carried out.
		if (!this.isJumping &&
			!this.isSwitchingLeft &&
			!this.isSwitchingRight &&
			this.queuedActions.length > 0) {
			switch (this.queuedActions.shift()) {
				case "up":
					this.isJumping = true;
					this.jumpStartTime = new Date() / 1000;
					break;
				case "left":
					if (this.currentLane != -1) {
						this.isSwitchingLeft = true;
					}
					break;
				case "right":
					if (this.currentLane != 1) {
						this.isSwitchingRight = true;
					}
					break;
			}
		}

		// If the character is jumping, update the height of the character.
		// Otherwise, the character continues running.
		if (this.isJumping) {
			var jumpClock = currentTime - this.jumpStartTime;
			this.element.position.y = this.jumpHeight * Math.sin(
				(1 / this.jumpDuration) * Math.PI * jumpClock) +
				sinusoid(2 * this.stepFreq, 0, 20, 0,
					this.jumpStartTime - this.runningStartTime);
			if (jumpClock > this.jumpDuration) {
				this.isJumping = false;
				this.runningStartTime += this.jumpDuration;
			}
		} else {
			var runningClock = currentTime - this.runningStartTime;
			this.element.position.y = sinusoid(
				2 * this.stepFreq, 0, 20, 0, runningClock);
			
			var delta = this.clock.getDelta();
  				if (this.animRun) this.animRun.update(delta);

			// If the character is not jumping, it may be switching lanes.
			if (this.isSwitchingLeft) {
				this.element.position.x -= 200;
				var offset = this.currentLane * 800 - this.element.position.x;
				if (offset > 800) {
					this.currentLane -= 1;
					this.element.position.x = this.currentLane * 800;
					this.isSwitchingLeft = false;
				}
			}
			if (this.isSwitchingRight) {
				this.element.position.x += 200;
				var offset = this.element.position.x - this.currentLane * 800;
				if (offset > 800) {
					this.currentLane += 1;
					this.element.position.x = this.currentLane * 800;
					this.isSwitchingRight = false;
				}
			}
		}
	}

	/**
	  * Handles character activity when the left key is pressed.
	  */
	onLeftKeyPressed () {
		this.queuedActions.push("left");
	}

	/**
	  * Handles character activity when the up key is pressed.
	  */
	onUpKeyPressed () {
		this.queuedActions.push("up");
	}

	/**
	  * Handles character activity when the right key is pressed.
	  */
	onRightKeyPressed () {
		this.queuedActions.push("right");
	}

	/**
	  * Handles character activity when the game is paused.
	  */
	onPause () {
		this.pauseStartTime = new Date() / 1000;
	}

	/**
	  * Handles character activity when the game is unpaused.
	  */
	onUnpause () {
		var currentTime = new Date() / 1000;
		var pauseDuration = currentTime - this.pauseStartTime;
		this.runningStartTime += pauseDuration;
		if (this.isJumping) {
			this.jumpStartTime += pauseDuration;
		}
	}
}

/**
  * A collidable tree in the game positioned at X, Y, Z in the scene and with
  * scale S.
  */
function Tree(x, y, z, s) {

	// Explicit binding.
	var self = this;

	// The object portrayed in the scene.
	this.mesh = new THREE.Object3D();
	var top = createCylinder(1, 300, 300, 4, Colors.green, 0, 1000, 0);
	var mid = createCylinder(1, 400, 400, 4, Colors.green, 0, 800, 0);
	var bottom = createCylinder(1, 500, 500, 4, Colors.green, 0, 500, 0);
	var trunk = createCylinder(100, 100, 250, 32, Colors.brownDark, 0, 125, 0);
	this.mesh.add(top);
	this.mesh.add(mid);
	this.mesh.add(bottom);
	this.mesh.add(trunk);
	this.mesh.position.set(x, y, z);
	this.mesh.scale.set(s, s, s);
	this.scale = s;

	/**
	 * A method that detects whether this tree is colliding with the character,
	 * which is modelled as a box bounded by the given coordinate space.
	 */
	this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
		var treeMinX = self.mesh.position.x - this.scale * 250;
		var treeMaxX = self.mesh.position.x + this.scale * 250;
		var treeMinY = self.mesh.position.y;
		var treeMaxY = self.mesh.position.y + this.scale * 1150;
		var treeMinZ = self.mesh.position.z - this.scale * 250;
		var treeMaxZ = self.mesh.position.z + this.scale * 250;
		return treeMinX <= maxX && treeMaxX >= minX
			&& treeMinY <= maxY && treeMaxY >= minY
			&& treeMinZ <= maxZ && treeMaxZ >= minZ;
	}

}

/** 
 *
 * UTILITY FUNCTIONS
 * 
 * Functions that simplify and minimize repeated code.
 *
 */

/**
 * Utility function for generating current values of sinusoidally
 * varying variables.
 *
 * @param {number} FREQUENCY The number of oscillations per second.
 * @param {number} MINIMUM The minimum value of the sinusoid.
 * @param {number} MAXIMUM The maximum value of the sinusoid.
 * @param {number} PHASE The phase offset in degrees.
 * @param {number} TIME The time, in seconds, in the sinusoid's scope.
 * @return {number} The value of the sinusoid.
 *
 */
function sinusoid(frequency, minimum, maximum, phase, time) {
	var amplitude = 0.5 * (maximum - minimum);
	var angularFrequency = 2 * Math.PI * frequency;
	var phaseRadians = phase * Math.PI / 180;
	var offset = amplitude * Math.sin(
		angularFrequency * time + phaseRadians);
	var average = (minimum + maximum) / 2;
	return average + offset;
}

/**
 * Creates an empty group of objects at a specified location.
 *
 * @param {number} X The x-coordinate of the group.
 * @param {number} Y The y-coordinate of the group.
 * @param {number} Z The z-coordinate of the group.
 * @return {Three.Group} An empty group at the specified coordinates.
 *
 */
function createGroup(x, y, z) {
	var group = new THREE.Group();
	group.position.set(x, y, z);
	return group;
}

/**
 * Creates and returns a simple box with the specified properties.
 *
 * @param {number} DX The width of the box.
 * @param {number} DY The height of the box.
 * @param {number} DZ The depth of the box.
 * @param {color} COLOR The color of the box.
 * @param {number} X The x-coordinate of the center of the box.
 * @param {number} Y The y-coordinate of the center of the box.
 * @param {number} Z The z-coordinate of the center of the box.
 * @param {boolean} NOTFLATSHADING True iff the flatShading is false.
 * @return {THREE.Mesh} A box with the specified properties.
 *
 */
function createBox(dx, dy, dz, color, x, y, z, notFlatShading) {
	var geom = new THREE.BoxGeometry(dx, dy, dz);
	var mat = new THREE.MeshPhongMaterial({
		color: color,
		flatShading: notFlatShading != true
	});
	var box = new THREE.Mesh(geom, mat);
	box.castShadow = true;
	box.receiveShadow = true;
	box.position.set(x, y, z);
	return box;
}

/**
 * Creates and returns a (possibly asymmetrical) cyinder with the 
 * specified properties.
 *
 * @param {number} RADIUSTOP The radius of the cylinder at the top.
 * @param {number} RADIUSBOTTOM The radius of the cylinder at the bottom.
 * @param {number} HEIGHT The height of the cylinder.
 * @param {number} RADIALSEGMENTS The number of segmented faces around 
 *                                the circumference of the cylinder.
 * @param {color} COLOR The color of the cylinder.
 * @param {number} X The x-coordinate of the center of the cylinder.
 * @param {number} Y The y-coordinate of the center of the cylinder.
 * @param {number} Z The z-coordinate of the center of the cylinder.
 * @return {THREE.Mesh} A box with the specified properties.
 */
function createCylinder(radiusTop, radiusBottom, height, radialSegments,
	color, x, y, z) {
	var geom = new THREE.CylinderGeometry(
		radiusTop, radiusBottom, height, radialSegments);
	var mat = new THREE.MeshPhongMaterial({
		color: color,
		flatShading: true
	});
	var cylinder = new THREE.Mesh(geom, mat);
	cylinder.castShadow = true;
	cylinder.receiveShadow = true;
	cylinder.position.set(x, y, z);
	return cylinder;
}
