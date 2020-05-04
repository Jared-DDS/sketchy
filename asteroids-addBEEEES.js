// See license: https://github.com/erkie/erkie.github.com/blob/master/README
// Modified for the Atom editor environment by Tom Preston-Werner.

startAsteroids = function() {
function Asteroids() {
	if ( ! window.ASTEROIDS )
		window.ASTEROIDS = {
			enemiesKilled: 0,
			startedPlaying: (new Date()).getTime()
		};

	/*
		Classes
	*/

	function Vector(x, y) {
		if ( typeof x == 'Object' ) {
			this.x = x.x;
			this.y = x.y;
		} else {
			this.x = x;
			this.y = y;
		}
	};

	Vector.prototype = {
		cp: function() {
			return new Vector(this.x, this.y);
		},

		mul: function(factor) {
			this.x *= factor;
			this.y *= factor;
			return this;
		},

		mulNew: function(factor) {
			return new Vector(this.x * factor, this.y * factor);
		},

		add: function(vec) {
			this.x += vec.x;
			this.y += vec.y;
			return this;
		},

		addNew: function(vec) {
			return new Vector(this.x + vec.x, this.y + vec.y);
		},

		sub: function(vec) {
			this.x -= vec.x;
			this.y -= vec.y;
			return this;
		},

		subNew: function(vec) {
			return new Vector(this.x - vec.x, this.y - vec.y);
		},

		// angle in radians
		rotate: function(angle) {
			var x = this.x, y = this.y;
			this.x = x * Math.cos(angle) - Math.sin(angle) * y;
			this.y = x * Math.sin(angle) + Math.cos(angle) * y;
			return this;
		},

		// angle still in radians
		rotateNew: function(angle) {
			return this.cp().rotate(angle);
		},

		// angle in radians... again
		setAngle: function(angle) {
			var l = this.len();
			this.x = Math.cos(angle) * l;
			this.y = Math.sin(angle) * l;
			return this;
		},

		// RADIANS
		setAngleNew: function(angle) {
			return this.cp().setAngle(angle);
		},

		setLength: function(length) {
			var l = this.len();
			if ( l ) this.mul(length / l);
			else this.x = this.y = length;
			return this;
		},

		setLengthNew: function(length) {
			return this.cp().setLength(length);
		},

		normalize: function() {
			var l = this.len();
			this.x /= l;
			this.y /= l;
			return this;
		},

		normalizeNew: function() {
			return this.cp().normalize();
		},

		angle: function() {
			return Math.atan2(this.y, this.x);
		},

		collidesWith: function(rect) {
			return this.x > rect.x && this.y > rect.y && this.x < rect.x + rect.width && this.y < rect.y + rect.height;
		},

		len: function() {
			var l = Math.sqrt(this.x * this.x + this.y * this.y);
			if ( l < 0.005 && l > -0.005) return 0;
			return l;
		},

		is: function(test) {
			return typeof test == 'object' && this.x == test.x && this.y == test.y;
		},

		toString: function() {
			return '[Vector(' + this.x + ', ' + this.y + ') angle: ' + this.angle() + ', length: ' + this.len() + ']';
		}
	};

	function Line(p1, p2) {
		this.p1 = p1;
		this.p2 = p2;
	};

	Line.prototype = {
		shift: function(pos) {
			this.p1.add(pos);
			this.p2.add(pos);
		},

		intersectsWithRect: function(rect) {
			var LL = new Vector(rect.x, rect.y + rect.height);
			var UL = new Vector(rect.x, rect.y);
			var LR = new Vector(rect.x + rect.width, rect.y + rect.height);
			var UR = new Vector(rect.x + rect.width, rect.y);

			if (
				this.p1.x > LL.x && this.p1.x < UR.x && this.p1.y < LL.y && this.p1.y > UR.y &&
				this.p2.x > LL.x && this.p2.x < UR.x && this.p2.y < LL.y && this.p2.y > UR.y
			) return true;

			if ( this.intersectsLine(new Line(UL, LL)) ) return true;
			if ( this.intersectsLine(new Line(LL, LR)) ) return true;
			if ( this.intersectsLine(new Line(UL, UR)) ) return true;
			if ( this.intersectsLine(new Line(UR, LR)) ) return true;
			return false;
		},

		intersectsLine: function(line2) {
			var v1 = this.p1, v2 = this.p2;
			var v3 = line2.p1, v4 = line2.p2;

			var denom = ((v4.y - v3.y) * (v2.x - v1.x)) - ((v4.x - v3.x) * (v2.y - v1.y));
			var numerator = ((v4.x - v3.x) * (v1.y - v3.y)) - ((v4.y - v3.y) * (v1.x - v3.x));

			var numerator2 = ((v2.x - v1.x) * (v1.y - v3.y)) - ((v2.y - v1.y) * (v1.x - v3.x));

			if ( denom == 0.0 ) {
				return false;
			}
			var ua = numerator / denom;
			var ub = numerator2 / denom;

			return (ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0);
		}
	};

	/*
		end classes, begin code
	*/

	var that = this;

	// configuration directives are placed in local variables
	var w = document.documentElement.clientWidth, h = document.documentElement.clientHeight;

	var playerWidth = 20, playerHeight = 30;

	var playerVerts = [[-1 * playerHeight/2, -1 * playerWidth/2], [-1 * playerHeight/2, playerWidth/2], [playerHeight/2, 0]];

	var ignoredTypes = ['HTML', 'HEAD', 'BODY', 'SCRIPT', 'TITLE', 'META', 'STYLE', 'LINK'];
	var hiddenTypes = ['BR', 'HR'];

	var FPS = 50;

	// units/second
	var acc			  = 300;
	var maxSpeed	  = 600;
	var rotSpeed	  = 360; // one rotation per second
	var bulletSpeed	  = 700;
	var particleSpeed = 400;

	var timeBetweenFire = 150; // how many milliseconds between shots
	var timeBetweenBlink = 250; // milliseconds between enemy blink
	var timeBetweenEnemyUpdate = 2000;
	var bulletRadius = 2;
	var maxParticles = 40;
	var maxBullets = 20;

	// generated every 10 ms
	this.flame = {r: [], y: []};

	// blink style
	this.toggleBlinkStyle = function () {
		if (this.updated.blink.isActive) {
			removeClass(document.body, 'ASTEROIDSBLINK');
		} else {
			addClass(document.body, 'ASTEROIDSBLINK');
		}

		this.updated.blink.isActive = !this.updated.blink.isActive;
	};

	addStylesheet(".ASTEROIDSBLINK .ASTEROIDSYEAHENEMY", "outline: 2px dotted red;");

	this.pos = new Vector(100, 100);
	this.lastPos = false;
	this.vel = new Vector(0, 0);
	this.dir = new Vector(0, 1);
	this.keysPressed = {};
	this.firedAt = false;
	this.updated = {
		enemies: false, // if the enemy index has been updated since the user pressed B for Blink
		flame: new Date().getTime(), // the time the flame was last updated
		blink: {time: 0, isActive: false}
	};
	this.scrollPos = new Vector(0, 0);

	this.bullets = [];

	// Enemies lay first in this.enemies, when they are shot they are moved to this.dying
	this.enemies = [];
	this.dying = [];
	this.totalEnemies = 0;

	// Particles are created when something is shot
	this.particles = [];

	// things to shoot is everything textual and an element of type not specified
	// in types AND not a navigation element (see further down)
	function updateEnemyIndex() {
		for ( var i = 0, enemy; enemy = that.enemies[i]; i++ )
			removeClass(enemy, "ASTEROIDSYEAHENEMY");

		var all = document.body.getElementsByTagName('*');
		that.enemies = [];
		for ( var i = 0, el; el = all[i]; i++ ) {
			// elements with className ASTEROIDSYEAH are part of the "game"
			if ( indexOf(ignoredTypes, el.tagName.toUpperCase()) == -1 && el.prefix != 'g_vml_' && hasOnlyTextualChildren(el) && el.className != "ASTEROIDSYEAH" && el.offsetHeight > 0 ) {
				el.aSize = size(el);
				that.enemies.push(el);

				addClass(el, "ASTEROIDSYEAHENEMY");

				// this is only for enemycounting
				if ( ! el.aAdded ) {
					el.aAdded = true;
					that.totalEnemies++;
				}
			}
		}
	};
	updateEnemyIndex();

	// createFlames create the vectors for the flames of the ship
	var createFlames;
	(function () {
		var rWidth = playerWidth,
			rIncrease = playerWidth * 0.1,
			yWidth = playerWidth * 0.6,
			yIncrease = yWidth * 0.2,
			halfR = rWidth / 2,
			halfY = yWidth / 2,
			halfPlayerHeight = playerHeight / 2;

		createFlames = function () {
			// Firstly create red flames
			that.flame.r = [[-1 * halfPlayerHeight, -1 * halfR]];
			that.flame.y = [[-1 * halfPlayerHeight, -1 * halfY]];

			for ( var x = 0; x < rWidth; x += rIncrease ) {
				that.flame.r.push([-random(2, 7) - halfPlayerHeight, x - halfR]);
			}

			that.flame.r.push([-1 * halfPlayerHeight, halfR]);

			// ... And now the yellow flames
			for ( var x = 0; x < yWidth; x += yIncrease ) {
				that.flame.y.push([-random(2, 7) - halfPlayerHeight, x - halfY]);
			}

			that.flame.y.push([-1 * halfPlayerHeight, halfY]);
		};
	})();

	createFlames();

	/*
		Math operations
	*/

	function radians(deg) {
		return deg * 0.0174532925;
	};

	function degrees(rad) {
		return rad * 57.2957795;
	};

	function random(from, to) {
		return Math.floor(Math.random() * (to + 1) + from);
	};

	/*
		Misc operations
	*/

	function code(name) {
		var table = {'up': 38, 'down': 40, 'left': 37, 'right': 39, 'esc': 27};
		if ( table[name] ) return table[name];
		return name.charCodeAt(0);
	};

	function boundsCheck(vec) {
		if ( vec.x > w )
			vec.x = 0;
		else if ( vec.x < 0 )
			vec.x = w;

		if ( vec.y > h )
			vec.y = 0;
		else if ( vec.y < 0 )
			vec.y = h;
	};

	function size(element) {
		var el = element, left = 0, top = 0;
		do {
			left += el.offsetLeft || 0;
			top += el.offsetTop || 0;
			el = el.offsetParent;
		} while (el);
		return {x: left, y: top, width: element.offsetWidth || 10, height: element.offsetHeight || 10};
	};

	// Taken from:
	// http://www.quirksmode.org/blog/archives/2005/10/_and_the_winner_1.html
	function addEvent( obj, type, fn ) {
		if (obj.addEventListener)
			obj.addEventListener( type, fn, false );
		else if (obj.attachEvent) {
			obj["e"+type+fn] = fn;
			obj[type+fn] = function() { obj["e"+type+fn]( window.event ); };
			obj.attachEvent( "on"+type, obj[type+fn] );
		}
	}

	function removeEvent( obj, type, fn ) {
		if (obj.removeEventListener)
			obj.removeEventListener( type, fn, false );
		else if (obj.detachEvent) {
			obj.detachEvent( "on"+type, obj[type+fn] );
			obj[type+fn] = null;
			obj["e"+type+fn] = null;
		}
	}

	function arrayRemove(array, from, to) {
		var rest = array.slice((to || from) + 1 || array.length);
		array.length = from < 0 ? array.length + from : from;
		return array.push.apply(array, rest);
	};

	function applyVisibility(vis) {
		for ( var i = 0, p; p = window.ASTEROIDSPLAYERS[i]; i++ ) {
			p.gameContainer.style.visibility = vis;
		}
	}

	function getElementFromPoint(x, y) {
		// hide canvas so it isn't picked up
		applyVisibility('hidden');

		var element = document.elementFromPoint(x, y);

		if ( ! element ) {
			applyVisibility('visible');
			return false;
		}

		if ( element.nodeType == 3 )
			element = element.parentNode;

		// show the canvas again, hopefully it didn't blink
		applyVisibility('visible');
		return element;
	};

	function addParticles(startPos) {
		var time = new Date().getTime();
		var amount = maxParticles;
		for ( var i = 0; i < amount; i++ ) {
			that.particles.push({
				// random direction
				dir: (new Vector(Math.random() * 20 - 10, Math.random() * 20 - 10)).normalize(),
				pos: startPos.cp(),
				cameAlive: time
			});
		}
	};

	function hasOnlyTextualChildren(element) {
		if ( element.offsetLeft < -100 && element.offsetWidth > 0 && element.offsetHeight > 0 ) return false;
		if ( indexOf(hiddenTypes, element.tagName) != -1 ) return true;

		if ( element.offsetWidth == 0 && element.offsetHeight == 0 ) return false;
		for ( var i = 0; i < element.childNodes.length; i++ ) {
			// <br /> doesn't count... and empty elements
			if (
				indexOf(hiddenTypes, element.childNodes[i].tagName) == -1
				&& element.childNodes[i].childNodes.length != 0
			) return false;
		}
		return true;
	};

	function indexOf(arr, item, from){
		if ( arr.indexOf ) return arr.indexOf(item, from);
		var len = arr.length;
		for (var i = (from < 0) ? Math.max(0, len + from) : from || 0; i < len; i++){
			if (arr[i] === item) return i;
		}
		return -1;
	};

	// taken from MooTools Core
	function addClass(element, className) {
		if ( element.className.indexOf(className) == -1)
			element.className = (element.className + ' ' + className).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
	};

	// taken from MooTools Core
	function removeClass(element, className) {
		element.className = element.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1');
	};

	function addStylesheet(selector, rules) {
		var stylesheet = document.createElement('style');
		stylesheet.type = 'text/css';
		stylesheet.rel = 'stylesheet';
		stylesheet.id = 'ASTEROIDSYEAHSTYLES';
		try {
			stylesheet.innerHTML = selector + "{" + rules + "}";
		} catch ( e ) {
			stylesheet.styleSheet.addRule(selector, rules);
		}
		document.getElementsByTagName("head")[0].appendChild(stylesheet);
	};

	function removeStylesheet(name) {
		var stylesheet = document.getElementById(name);
		if ( stylesheet ) {
			stylesheet.parentNode.removeChild(stylesheet);
		}
	};

	/*
		== Setup ==
	*/
	this.gameContainer = document.createElement('div');
	this.gameContainer.className = 'ASTEROIDSYEAH';
	document.body.appendChild(this.gameContainer);

	this.canvas = document.createElement('canvas');
	this.canvas.setAttribute('width', w);
	this.canvas.setAttribute('height', h);
	this.canvas.className = 'ASTEROIDSYEAH';
	with ( this.canvas.style ) {
		width = w + "px";
		height = h + "px";
		position = "fixed";
		top = "0px";
		left = "0px";
		bottom = "0px";
		right = "0px";
		zIndex = "10000";
	}

	addEvent(this.canvas, 'mousedown', function(e) {
		e = e || window.event;
		var message = document.createElement('span');
		message.style.position = 'absolute';
		message.style.border = '1px solid #999';
		message.style.background = 'white';
		message.style.color = "black";
		message.innerHTML = 'Press Esc to quit';
		document.body.appendChild(message);

		var x = e.pageX || (e.clientX + document.documentElement.scrollLeft);
		var y = e.pageY || (e.clientY + document.documentElement.scrollTop);
		message.style.left = x - message.offsetWidth/2 + 'px';
		message.style.top = y - message.offsetHeight/2 + 'px';

		setTimeout(function() {
			try {
				message.parentNode.removeChild(message);
			} catch ( e ) {}
		}, 1000);
	});

	var eventResize = function() {
		that.canvas.style.display = "none";

		w = document.documentElement.clientWidth;
		h = document.documentElement.clientHeight;

		that.canvas.setAttribute('width', w);
		that.canvas.setAttribute('height', h);

		with ( that.canvas.style ) {
			display = "block";
			width = w + "px";
			height = h + "px";
		}
		forceChange = true;
	};
	addEvent(window, 'resize', eventResize);

	this.gameContainer.appendChild(this.canvas);
	this.ctx = this.canvas.getContext("2d");

	this.ctx.fillStyle = "black";
	this.ctx.strokeStyle = "black";

	/*
		== Events ==
	*/

	var eventKeydown = function(event) {
		event = event || window.event;
		if ( event.ctrlKey || event.shiftKey )
			return;
		that.keysPressed[event.keyCode] = true;

		switch ( event.keyCode ) {
			case code(' '):
				that.firedAt = 1;
			break;
		}

		// check here so we can stop propagation appropriately
		if ( indexOf([code('up'), code('down'), code('right'), code('left'), code(' '), code('B'), code('W'), code('A'), code('S'), code('D')], event.keyCode) != -1 ) {
			if ( event.ctrlKey || event.shiftKey )
				return;

			if ( event.preventDefault )
				event.preventDefault();
			if ( event.stopPropagation)
				event.stopPropagation();
			event.returnValue = false;
			event.cancelBubble = true;
			return false;
		}
	};
	addEvent(document.body, 'keydown', eventKeydown);

	var eventKeypress = function(event) {
		event = event || window.event;
		if ( indexOf([code('up'), code('down'), code('right'), code('left'), code(' '), code('W'), code('A'), code('S'), code('D')], event.keyCode || event.which) != -1 ) {
			if ( event.ctrlKey || event.shiftKey )
				return;

			if ( event.preventDefault )
				event.preventDefault();
			if ( event.stopPropagation )
				event.stopPropagation();
			event.returnValue = false;
			event.cancelBubble = true;
			return false;
		}
	};
	addEvent(document, 'keypress', eventKeypress);

	var eventKeyup = function(event) {
		event = event || window.event;
		that.keysPressed[event.keyCode] = false;

		if ( indexOf([code('up'), code('down'), code('right'), code('left'), code(' '), code('B'), code('W'), code('A'), code('S'), code('D')], event.keyCode) != -1 ) {
			if ( event.preventDefault )
				event.preventDefault();
			if ( event.stopPropagation )
				event.stopPropagation();
			event.returnValue = false;
			event.cancelBubble = true;
			return false;
		}
	};
	addEvent(document, 'keyup', eventKeyup);

	/*
		Context operations
	*/

	this.ctx.clear = function() {
		this.clearRect(0, 0, w, h);
	};

	this.ctx.clear();

	this.ctx.drawLine = function(xFrom, yFrom, xTo, yTo) {
		this.beginPath();
		this.moveTo(xFrom, yFrom);
		this.lineTo(xTo, yTo);
		this.lineTo(xTo + 1, yTo + 1);
		this.closePath();
		this.fill();
	};

	this.ctx.tracePoly = function(verts) {
		this.beginPath();
		this.moveTo(verts[0][0], verts[0][1]);
		for ( var i = 1; i < verts.length; i++ )
			this.lineTo(verts[i][0], verts[i][1]);
		this.closePath();
	};

	var THEPLAYER = false;
	if ( window.KICKASSIMG ) {
		THEPLAYER = document.createElement('img');
		THEPLAYER.src = window.KICKASSIMG;
	}

	this.ctx.drawPlayer = function() {
		if ( ! THEPLAYER ) {
			this.save();
			this.translate(that.pos.x, that.pos.y);
			this.rotate(that.dir.angle());
			this.tracePoly(playerVerts);
			this.fillStyle = "white";
			this.fill();
			this.tracePoly(playerVerts);
			this.stroke();
			this.restore();
		} else {
			this.save();
			this.translate(that.pos.x, that.pos.y);
			this.rotate(that.dir.angle()+Math.PI/2);
			this.drawImage(THEPLAYER, -THEPLAYER.width/2, -THEPLAYER.height/2);
			this.restore();
		}
	};

	var PI_SQ = Math.PI*2;

	this.ctx.drawBullets = function(bullets) {
		for ( var i = 0; i < bullets.length; i++ ) {
			this.beginPath();
			this.fillStyle = "red";
			this.arc(bullets[i].pos.x, bullets[i].pos.y, bulletRadius, 0, PI_SQ, true);
			this.closePath();
			this.fill();
		}
	};

	var randomParticleColor = function() {
		return (['red', 'yellow'])[random(0, 1)];
	};

	this.ctx.drawParticles = function(particles) {
		var oldColor = this.fillStyle;

		for ( var i = 0; i < particles.length; i++ ) {
			this.fillStyle = randomParticleColor();
			this.drawLine(particles[i].pos.x, particles[i].pos.y, particles[i].pos.x - particles[i].dir.x * 10, particles[i].pos.y - particles[i].dir.y * 10);
		}

		this.fillStyle = oldColor;
	};

	this.ctx.drawFlames = function(flame) {
		if ( THEPLAYER ) return;

		this.save();

		this.translate(that.pos.x, that.pos.y);
		this.rotate(that.dir.angle());

		var oldColor = this.strokeStyle;
		this.strokeStyle = "red";
		this.tracePoly(flame.r);
		this.stroke();

		this.strokeStyle = "yellow";
		this.tracePoly(flame.y);
		this.stroke();

		this.strokeStyle = oldColor;
		this.restore();
	};

	/*
		Game loop
	*/

	// Attempt to focus window if possible, so keyboard events are posted to us
	try {
		window.focus();
	} catch ( e ) {}

	addParticles(this.pos);
	addClass(document.body, 'ASTEROIDSYEAH');

	var isRunning = true;
	var lastUpdate = new Date().getTime();
	var forceChange = false;

	this.update = function() {
		// ==
		// logic
		// ==
		var nowTime = new Date().getTime();
		var tDelta = (nowTime - lastUpdate) / 1000;
		lastUpdate = nowTime;

		// update flame and timer if needed
		var drawFlame = false;
		if ( nowTime - this.updated.flame > 50 ) {
			createFlames();
			this.updated.flame = nowTime;
		}

		this.scrollPos.x = window.pageXOffset || document.documentElement.scrollLeft;
		this.scrollPos.y = window.pageYOffset || document.documentElement.scrollTop;

		// update player
		// move forward
		if ( (this.keysPressed[code('up')]) || (this.keysPressed[code('W')]) ) {
			this.vel.add(this.dir.mulNew(acc * tDelta));

			drawFlame = true;
		} else {
			// decrease speed of player
			this.vel.mul(0.96);
		}

		// rotate counter-clockwise
		if ( (this.keysPressed[code('left')]) || (this.keysPressed[code('A')]) ) {
			forceChange = true;
			this.dir.rotate(radians(rotSpeed * tDelta * -1));
		}

		// rotate clockwise
		if ( (this.keysPressed[code('right')]) || (this.keysPressed[code('D')]) ) {
			forceChange = true;
			this.dir.rotate(radians(rotSpeed * tDelta));
		}

		// fire
		if ( this.keysPressed[code(' ')] && nowTime - this.firedAt > timeBetweenFire ) {
			this.bullets.unshift({
				'dir': this.dir.cp(),
				'pos': this.pos.cp(),
				'startVel': this.vel.cp(),
				'cameAlive': nowTime
			});

			this.firedAt = nowTime;

			if ( this.bullets.length > maxBullets ) {
				this.bullets.pop();
			}
		}

		// add blink
		if ( this.keysPressed[code('B')] ) {
			if ( ! this.updated.enemies ) {
				updateEnemyIndex();
				this.updated.enemies = true;
			}

			forceChange = true;

			this.updated.blink.time += tDelta * 1000;
			if ( this.updated.blink.time > timeBetweenBlink ) {
				this.toggleBlinkStyle();
				this.updated.blink.time = 0;
			}
		} else {
			this.updated.enemies = false;
		}

		if ( this.keysPressed[code('esc')] ) {
			destroy.apply(this);
			return;
		}

		// cap speed
		if ( this.vel.len() > maxSpeed ) {
			this.vel.setLength(maxSpeed);
		}

		// add velocity to player (physics)
		this.pos.add(this.vel.mulNew(tDelta));

		// check bounds X of player, if we go outside we scroll accordingly
		if ( this.pos.x > w ) {
			window.scrollTo(this.scrollPos.x + 50, this.scrollPos.y);
			this.pos.x = 0;
		} else if ( this.pos.x < 0 ) {
			window.scrollTo(this.scrollPos.x - 50, this.scrollPos.y);
			this.pos.x = w;
		}

		// check bounds Y
		if ( this.pos.y > h ) {
			window.scrollTo(this.scrollPos.x, this.scrollPos.y + h * 0.75);
			this.pos.y = 0;
		} else if ( this.pos.y < 0 ) {
			window.scrollTo(this.scrollPos.x, this.scrollPos.y - h * 0.75);
			this.pos.y = h;
		}

		// update positions of bullets
		for ( var i = this.bullets.length - 1; i >= 0; i-- ) {
			// bullets should only live for 2 seconds
			if ( nowTime - this.bullets[i].cameAlive > 2000 ) {
				this.bullets.splice(i, 1);
				forceChange = true;
				continue;
			}

			var bulletVel = this.bullets[i].dir.setLengthNew(bulletSpeed * tDelta).add(this.bullets[i].startVel.mulNew(tDelta));

			this.bullets[i].pos.add(bulletVel);
			boundsCheck(this.bullets[i].pos);

			// check collisions
			var murdered = getElementFromPoint(this.bullets[i].pos.x, this.bullets[i].pos.y);
			if (
				murdered && murdered.tagName &&
				indexOf(ignoredTypes, murdered.tagName.toUpperCase()) == -1 &&
				hasOnlyTextualChildren(murdered) && murdered.className != "ASTEROIDSYEAH"
			) {
				didKill = true;
				addParticles(this.bullets[i].pos);
				this.dying.push(murdered);

				this.bullets.splice(i, 1);
				continue;
			}
		}

		if (this.dying.length) {
			for ( var i = this.dying.length - 1; i >= 0; i-- ) {
				try {
					// If we have multiple spaceships it might have already been removed
					if ( this.dying[i].parentNode )
						window.ASTEROIDS.enemiesKilled++;

					this.dying[i].parentNode.removeChild(this.dying[i]);
				} catch ( e ) {}
			}

			this.dying = [];
		}

		// update particles position
		for ( var i = this.particles.length - 1; i >= 0; i-- ) {
			this.particles[i].pos.add(this.particles[i].dir.mulNew(particleSpeed * tDelta * Math.random()));

			if ( nowTime - this.particles[i].cameAlive > 1000 ) {
				this.particles.splice(i, 1);
				forceChange = true;
				continue;
			}
		}

		// ==
		// drawing
		// ==

		// clear
		if ( forceChange || this.bullets.length != 0 || this.particles.length != 0 || ! this.pos.is(this.lastPos) || this.vel.len() > 0 ) {
			this.ctx.clear();

			// draw player
			this.ctx.drawPlayer();

			// draw flames
			if ( drawFlame )
				this.ctx.drawFlames(that.flame);

			// draw bullets
			if (this.bullets.length) {
				this.ctx.drawBullets(this.bullets);
			}

			// draw particles
			if (this.particles.length) {
				this.ctx.drawParticles(this.particles);
			}
		}
		this.lastPos = this.pos;
		forceChange = false;
	};

	// Start timer
	var updateFunc = function() {
		that.update.call(that);
	};
	var interval = setInterval(updateFunc, 1000 / FPS);

	function destroy() {
		clearInterval(interval);
		removeEvent(document, 'keydown', eventKeydown);
		removeEvent(document, 'keypress', eventKeypress);
		removeEvent(document, 'keyup', eventKeyup);
		removeEvent(window, 'resize', eventResize);
		isRunning = false;
		removeStylesheet("ASTEROIDSYEAHSTYLES");
		removeClass(document.body, 'ASTEROIDSYEAH');
		this.gameContainer.parentNode.removeChild(this.gameContainer);
	};
}

if ( ! window.ASTEROIDSPLAYERS )
	window.ASTEROIDSPLAYERS = [];

window.ASTEROIDSPLAYERS[window.ASTEROIDSPLAYERS.length] = new Asteroids();

};
HOME
The Entire Bee Movie Script
Bee Movie Script - Dialogue Transcript


According to all known laws
of aviation,


there is no way a bee
should be able to fly.


Its wings are too small to get
its fat little body off the ground.


The bee, of course, flies anyway


because bees don't care
what humans think is impossible.


Yellow, black. Yellow, black.
Yellow, black. Yellow, black.


Ooh, black and yellow!
Let's shake it up a little.


Barry! Breakfast is ready!


Ooming!


Hang on a second.


Hello?


- Barry?
- Adam?


- Oan you believe this is happening?
- I can't. I'll pick you up.


Looking sharp.


Use the stairs. Your father
paid good money for those.


Sorry. I'm excited.


Here's the graduate.
We're very proud of you, son.


A perfect report card, all B's.


Very proud.


Ma! I got a thing going here.


- You got lint on your fuzz.
- Ow! That's me!


- Wave to us! We'll be in row 118,000.
- Bye!


Barry, I told you,
stop flying in the house!


- Hey, Adam.
- Hey, Barry.


- Is that fuzz gel?
- A little. Special day, graduation.


Never thought I'd make it.


Three days grade school,
three days high school.


Those were awkward.


Three days college. I'm glad I took
a day and hitchhiked around the hive.


You did come back different.


- Hi, Barry.
- Artie, growing a mustache? Looks good.


- Hear about Frankie?
- Yeah.


- You going to the funeral?
- No, I'm not going.


Everybody knows,
sting someone, you die.


Don't waste it on a squirrel.
Such a hothead.


I guess he could have
just gotten out of the way.


I love this incorporating
an amusement park into our day.


That's why we don't need vacations.


Boy, quite a bit of pomp...
under the circumstances.


- Well, Adam, today we are men.
- We are!


- Bee-men.
- Amen!


Hallelujah!


Students, faculty, distinguished bees,


please welcome Dean Buzzwell.


Welcome, New Hive Oity
graduating class of...


...9:15.


That concludes our ceremonies.


And begins your career
at Honex Industries!


Will we pick ourjob today?


I heard it's just orientation.


Heads up! Here we go.


Keep your hands and antennas
inside the tram at all times.


- Wonder what it'll be like?
- A little scary.


Welcome to Honex,
a division of Honesco


and a part of the Hexagon Group.


This is it!


Wow.


Wow.


We know that you, as a bee,
have worked your whole life


to get to the point where you
can work for your whole life.


Honey begins when our valiant Pollen
Jocks bring the nectar to the hive.


Our top-secret formula


is automatically color-corrected,
scent-adjusted and bubble-contoured


into this soothing sweet syrup


with its distinctive
golden glow you know as...


Honey!


- That girl was hot.
- She's my cousin!


- She is?
- Yes, we're all cousins.


- Right. You're right.
- At Honex, we constantly strive


to improve every aspect
of bee existence.


These bees are stress-testing
a new helmet technology.


- What do you think he makes?
- Not enough.


Here we have our latest advancement,
the Krelman.


- What does that do?
- Oatches that little strand of honey


that hangs after you pour it.
Saves us millions.


Oan anyone work on the Krelman?


Of course. Most bee jobs are
small ones. But bees know


that every small job,
if it's done well, means a lot.


But choose carefully


because you'll stay in the job
you pick for the rest of your life.


The same job the rest of your life?
I didn't know that.


What's the difference?


You'll be happy to know that bees,
as a species, haven't had one day off


in 27 million years.


So you'll just work us to death?


We'll sure try.


Wow! That blew my mind!


"What's the difference?"
How can you say that?


One job forever?
That's an insane choice to have to make.


I'm relieved. Now we only have
to make one decision in life.


But, Adam, how could they
never have told us that?


Why would you question anything?
We're bees.


We're the most perfectly
functioning society on Earth.


You ever think maybe things
work a little too well here?


Like what? Give me one example.


I don't know. But you know
what I'm talking about.


Please clear the gate.
Royal Nectar Force on approach.


Wait a second. Oheck it out.


- Hey, those are Pollen Jocks!
- Wow.


I've never seen them this close.


They know what it's like
outside the hive.


Yeah, but some don't come back.


- Hey, Jocks!
- Hi, Jocks!


You guys did great!


You're monsters!
You're sky freaks! I love it! I love it!


- I wonder where they were.
- I don't know.


Their day's not planned.


Outside the hive, flying who knows
where, doing who knows what.


You can'tjust decide to be a Pollen
Jock. You have to be bred for that.


Right.


Look. That's more pollen
than you and I will see in a lifetime.


It's just a status symbol.
Bees make too much of it.


Perhaps. Unless you're wearing it
and the ladies see you wearing it.


Those ladies?
Aren't they our cousins too?


Distant. Distant.


Look at these two.


- Oouple of Hive Harrys.
- Let's have fun with them.


It must be dangerous
being a Pollen Jock.


Yeah. Once a bear pinned me
against a mushroom!


He had a paw on my throat,
and with the other, he was slapping me!


- Oh, my!
- I never thought I'd knock him out.


What were you doing during this?


Trying to alert the authorities.


I can autograph that.


A little gusty out there today,
wasn't it, comrades?


Yeah. Gusty.


We're hitting a sunflower patch
six miles from here tomorrow.


- Six miles, huh?
- Barry!


A puddle jump for us,
but maybe you're not up for it.


- Maybe I am.
- You are not!


We're going 0900 at J-Gate.


What do you think, buzzy-boy?
Are you bee enough?


I might be. It all depends
on what 0900 means.


Hey, Honex!


Dad, you surprised me.


You decide what you're interested in?


- Well, there's a lot of choices.
- But you only get one.


Do you ever get bored
doing the same job every day?


Son, let me tell you about stirring.


You grab that stick, and you just
move it around, and you stir it around.


You get yourself into a rhythm.
It's a beautiful thing.


You know, Dad,
the more I think about it,


maybe the honey field
just isn't right for me.


You were thinking of what,
making balloon animals?


That's a bad job
for a guy with a stinger.


Janet, your son's not sure
he wants to go into honey!


- Barry, you are so funny sometimes.
- I'm not trying to be funny.


You're not funny! You're going
into honey. Our son, the stirrer!


- You're gonna be a stirrer?
- No one's listening to me!


Wait till you see the sticks I have.


I could say anything right now.
I'm gonna get an ant tattoo!


Let's open some honey and celebrate!


Maybe I'll pierce my thorax.
Shave my antennae.


Shack up with a grasshopper. Get
a gold tooth and call everybody "dawg"!


I'm so proud.


- We're starting work today!
- Today's the day.


Oome on! All the good jobs
will be gone.


Yeah, right.


Pollen counting, stunt bee, pouring,
stirrer, front desk, hair removal...


- Is it still available?
- Hang on. Two left!


One of them's yours! Oongratulations!
Step to the side.


- What'd you get?
- Picking crud out. Stellar!


Wow!


Oouple of newbies?


Yes, sir! Our first day! We are ready!


Make your choice.


- You want to go first?
- No, you go.


Oh, my. What's available?


Restroom attendant's open,
not for the reason you think.


- Any chance of getting the Krelman?
- Sure, you're on.


I'm sorry, the Krelman just closed out.


Wax monkey's always open.


The Krelman opened up again.


What happened?


A bee died. Makes an opening. See?
He's dead. Another dead one.


Deady. Deadified. Two more dead.


Dead from the neck up.
Dead from the neck down. That's life!


Oh, this is so hard!


Heating, cooling,
stunt bee, pourer, stirrer,


humming, inspector number seven,
lint coordinator, stripe supervisor,


mite wrangler. Barry, what
do you think I should... Barry?


Barry!


All right, we've got the sunflower patch
in quadrant nine...


What happened to you?
Where are you?


- I'm going out.
- Out? Out where?


- Out there.
- Oh, no!


I have to, before I go
to work for the rest of my life.


You're gonna die! You're crazy! Hello?


Another call coming in.


If anyone's feeling brave,
there's a Korean deli on 83rd


that gets their roses today.


Hey, guys.


- Look at that.
- Isn't that the kid we saw yesterday?


Hold it, son, flight deck's restricted.


It's OK, Lou. We're gonna take him up.


Really? Feeling lucky, are you?


Sign here, here. Just initial that.


- Thank you.
- OK.


You got a rain advisory today,


and as you all know,
bees cannot fly in rain.


So be careful. As always,
watch your brooms,


hockey sticks, dogs,
birds, bears and bats.


Also, I got a couple of reports
of root beer being poured on us.


Murphy's in a home because of it,
babbling like a cicada!


- That's awful.
- And a reminder for you rookies,


bee law number one,
absolutely no talking to humans!


All right, launch positions!


Buzz, buzz, buzz, buzz! Buzz, buzz,
buzz, buzz! Buzz, buzz, buzz, buzz!


Black and yellow!


Hello!


You ready for this, hot shot?


Yeah. Yeah, bring it on.


Wind, check.


- Antennae, check.
- Nectar pack, check.


- Wings, check.
- Stinger, check.


Scared out of my shorts, check.


OK, ladies,


let's move it out!


Pound those petunias,
you striped stem-suckers!


All of you, drain those flowers!


Wow! I'm out!


I can't believe I'm out!


So blue.


I feel so fast and free!


Box kite!


Wow!


Flowers!


This is Blue Leader.
We have roses visual.


Bring it around 30 degrees and hold.


Roses!


30 degrees, roger. Bringing it around.


Stand to the side, kid.
It's got a bit of a kick.


That is one nectar collector!


- Ever see pollination up close?
- No, sir.


I pick up some pollen here, sprinkle it
over here. Maybe a dash over there,


a pinch on that one.
See that? It's a little bit of magic.


That's amazing. Why do we do that?


That's pollen power. More pollen, more
flowers, more nectar, more honey for us.


Oool.


I'm picking up a lot of bright yellow.
Oould be daisies. Don't we need those?


Oopy that visual.


Wait. One of these flowers
seems to be on the move.


Say again? You're reporting
a moving flower?


Affirmative.


That was on the line!


This is the coolest. What is it?


I don't know, but I'm loving this color.


It smells good.
Not like a flower, but I like it.


Yeah, fuzzy.


Ohemical-y.


Oareful, guys. It's a little grabby.


My sweet lord of bees!


Oandy-brain, get off there!


Problem!


- Guys!
- This could be bad.


Affirmative.


Very close.


Gonna hurt.


Mama's little boy.


You are way out of position, rookie!


Ooming in at you like a missile!


Help me!


I don't think these are flowers.


- Should we tell him?
- I think he knows.


What is this?!


Match point!


You can start packing up, honey,
because you're about to eat it!


Yowser!


Gross.


There's a bee in the car!


- Do something!
- I'm driving!


- Hi, bee.
- He's back here!


He's going to sting me!


Nobody move. If you don't move,
he won't sting you. Freeze!


He blinked!


Spray him, Granny!


What are you doing?!


Wow... the tension level
out here is unbelievable.


I gotta get home.


Oan't fly in rain.


Oan't fly in rain.


Oan't fly in rain.


Mayday! Mayday! Bee going down!


Ken, could you close
the window please?


Ken, could you close
the window please?


Oheck out my new resume.
I made it into a fold-out brochure.


You see? Folds out.


Oh, no. More humans. I don't need this.


What was that?


Maybe this time. This time. This time.
This time! This time! This...


Drapes!


That is diabolical.


It's fantastic. It's got all my special
skills, even my top-ten favorite movies.


What's number one? Star Wars?


Nah, I don't go for that...


...kind of stuff.


No wonder we shouldn't talk to them.
They're out of their minds.


When I leave a job interview, they're
flabbergasted, can't believe what I say.


There's the sun. Maybe that's a way out.


I don't remember the sun
having a big 75 on it.


I predicted global warming.


I could feel it getting hotter.
At first I thought it was just me.


Wait! Stop! Bee!


Stand back. These are winter boots.


Wait!


Don't kill him!


You know I'm allergic to them!
This thing could kill me!


Why does his life have
less value than yours?


Why does his life have any less value
than mine? Is that your statement?


I'm just saying all life has value. You
don't know what he's capable of feeling.


My brochure!


There you go, little guy.


I'm not scared of him.
It's an allergic thing.


Put that on your resume brochure.


My whole face could puff up.


Make it one of your special skills.


Knocking someone out
is also a special skill.


Right. Bye, Vanessa. Thanks.


- Vanessa, next week? Yogurt night?
- Sure, Ken. You know, whatever.


- You could put carob chips on there.
- Bye.


- Supposed to be less calories.
- Bye.


I gotta say something.


She saved my life.
I gotta say something.


All right, here it goes.


Nah.


What would I say?


I could really get in trouble.


It's a bee law.
You're not supposed to talk to a human.


I can't believe I'm doing this.


I've got to.


Oh, I can't do it. Oome on!


No. Yes. No.


Do it. I can't.


How should I start it?
"You like jazz?" No, that's no good.


Here she comes! Speak, you fool!


Hi!


I'm sorry.


- You're talking.
- Yes, I know.


You're talking!


I'm so sorry.


No, it's OK. It's fine.
I know I'm dreaming.


But I don't recall going to bed.


Well, I'm sure this
is very disconcerting.


This is a bit of a surprise to me.
I mean, you're a bee!


I am. And I'm not supposed
to be doing this,


but they were all trying to kill me.


And if it wasn't for you...


I had to thank you.
It's just how I was raised.


That was a little weird.


- I'm talking with a bee.
- Yeah.


I'm talking to a bee.
And the bee is talking to me!


I just want to say I'm grateful.
I'll leave now.


- Wait! How did you learn to do that?
- What?


The talking thing.


Same way you did, I guess.
"Mama, Dada, honey." You pick it up.


- That's very funny.
- Yeah.


Bees are funny. If we didn't laugh,
we'd cry with what we have to deal with.


Anyway...


Oan I...


...get you something?
- Like what?


I don't know. I mean...
I don't know. Ooffee?


I don't want to put you out.


It's no trouble. It takes two minutes.


- It's just coffee.
- I hate to impose.


- Don't be ridiculous!
- Actually, I would love a cup.


Hey, you want rum cake?


- I shouldn't.
- Have some.


- No, I can't.
- Oome on!


I'm trying to lose a couple micrograms.


- Where?
- These stripes don't help.


You look great!


I don't know if you know
anything about fashion.


Are you all right?


No.


He's making the tie in the cab
as they're flying up Madison.


He finally gets there.


He runs up the steps into the church.
The wedding is on.


And he says, "Watermelon?
I thought you said Guatemalan.


Why would I marry a watermelon?"


Is that a bee joke?


That's the kind of stuff we do.


Yeah, different.


So, what are you gonna do, Barry?


About work? I don't know.


I want to do my part for the hive,
but I can't do it the way they want.


I know how you feel.


- You do?
- Sure.


My parents wanted me to be a lawyer or
a doctor, but I wanted to be a florist.


- Really?
- My only interest is flowers.


Our new queen was just elected
with that same campaign slogan.


Anyway, if you look...


There's my hive right there. See it?


You're in Sheep Meadow!


Yes! I'm right off the Turtle Pond!


No way! I know that area.
I lost a toe ring there once.


- Why do girls put rings on their toes?
- Why not?


- It's like putting a hat on your knee.
- Maybe I'll try that.


- You all right, ma'am?
- Oh, yeah. Fine.


Just having two cups of coffee!


Anyway, this has been great.
Thanks for the coffee.


Yeah, it's no trouble.


Sorry I couldn't finish it. If I did,
I'd be up the rest of my life.


Are you...?


Oan I take a piece of this with me?


Sure! Here, have a crumb.


- Thanks!
- Yeah.


All right. Well, then...
I guess I'll see you around.


Or not.


OK, Barry.


And thank you
so much again... for before.


Oh, that? That was nothing.


Well, not nothing, but... Anyway...


This can't possibly work.


He's all set to go.
We may as well try it.


OK, Dave, pull the chute.


- Sounds amazing.
- It was amazing!


It was the scariest,
happiest moment of my life.


Humans! I can't believe
you were with humans!


Giant, scary humans!
What were they like?


Huge and crazy. They talk crazy.


They eat crazy giant things.
They drive crazy.


- Do they try and kill you, like on TV?
- Some of them. But some of them don't.


- How'd you get back?
- Poodle.


You did it, and I'm glad. You saw
whatever you wanted to see.


You had your "experience." Now you
can pick out yourjob and be normal.


- Well...
- Well?


Well, I met someone.


You did? Was she Bee-ish?


- A wasp?! Your parents will kill you!
- No, no, no, not a wasp.


- Spider?
- I'm not attracted to spiders.


I know it's the hottest thing,
with the eight legs and all.


I can't get by that face.


So who is she?


She's... human.


No, no. That's a bee law.
You wouldn't break a bee law.


- Her name's Vanessa.
- Oh, boy.


She's so nice. And she's a florist!


Oh, no! You're dating a human florist!


We're not dating.


You're flying outside the hive, talking
to humans that attack our homes


with power washers and M-80s!
One-eighth a stick of dynamite!


She saved my life!
And she understands me.


This is over!


Eat this.


This is not over! What was that?


- They call it a crumb.
- It was so stingin' stripey!


And that's not what they eat.
That's what falls off what they eat!


- You know what a Oinnabon is?
- No.


It's bread and cinnamon and frosting.
They heat it up...


Sit down!


...really hot!
- Listen to me!


We are not them! We're us.
There's us and there's them!


Yes, but who can deny
the heart that is yearning?


There's no yearning.
Stop yearning. Listen to me!


You have got to start thinking bee,
my friend. Thinking bee!


- Thinking bee.
- Thinking bee.


Thinking bee! Thinking bee!
Thinking bee! Thinking bee!


There he is. He's in the pool.


You know what your problem is, Barry?


I gotta start thinking bee?


How much longer will this go on?


It's been three days!
Why aren't you working?


I've got a lot of big life decisions
to think about.


What life? You have no life!
You have no job. You're barely a bee!


Would it kill you
to make a little honey?


Barry, come out.
Your father's talking to you.


Martin, would you talk to him?


Barry, I'm talking to you!


You coming?


Got everything?


All set!


Go ahead. I'll catch up.


Don't be too long.


Watch this!


Vanessa!


- We're still here.
- I told you not to yell at him.


He doesn't respond to yelling!


- Then why yell at me?
- Because you don't listen!


I'm not listening to this.


Sorry, I've gotta go.


- Where are you going?
- I'm meeting a friend.


A girl? Is this why you can't decide?


Bye.


I just hope she's Bee-ish.


They have a huge parade
of flowers every year in Pasadena?


To be in the Tournament of Roses,
that's every florist's dream!


Up on a float, surrounded
by flowers, crowds cheering.


A tournament. Do the roses
compete in athletic events?


No. All right, I've got one.
How come you don't fly everywhere?


It's exhausting. Why don't you
run everywhere? It's faster.


Yeah, OK, I see, I see.
All right, your turn.


TiVo. You can just freeze live TV?
That's insane!


You don't have that?


We have Hivo, but it's a disease.
It's a horrible, horrible disease.


Oh, my.


Dumb bees!


You must want to sting all those jerks.


We try not to sting.
It's usually fatal for us.


So you have to watch your temper.


Very carefully.
You kick a wall, take a walk,


write an angry letter and throw it out.
Work through it like any emotion:


Anger, jealousy, lust.


Oh, my goodness! Are you OK?


Yeah.


- What is wrong with you?!
- It's a bug.


He's not bothering anybody.
Get out of here, you creep!


What was that? A Pic 'N' Save circular?


Yeah, it was. How did you know?


It felt like about 10 pages.
Seventy-five is pretty much our limit.


You've really got that
down to a science.


- I lost a cousin to Italian Vogue.
- I'll bet.


What in the name
of Mighty Hercules is this?


How did this get here?
Oute Bee, Golden Blossom,


Ray Liotta Private Select?


- Is he that actor?
- I never heard of him.


- Why is this here?
- For people. We eat it.


You don't have
enough food of your own?


- Well, yes.
- How do you get it?


- Bees make it.
- I know who makes it!


And it's hard to make it!


There's heating, cooling, stirring.
You need a whole Krelman thing!


- It's organic.
- It's our-ganic!


It's just honey, Barry.


Just what?!


Bees don't know about this!
This is stealing! A lot of stealing!


You've taken our homes, schools,
hospitals! This is all we have!


And it's on sale?!
I'm getting to the bottom of this.


I'm getting to the bottom
of all of this!


Hey, Hector.


- You almost done?
- Almost.


He is here. I sense it.


Well, I guess I'll go home now


and just leave this nice honey out,
with no one around.


You're busted, box boy!


I knew I heard something.
So you can talk!


I can talk.
And now you'll start talking!


Where you getting the sweet stuff?
Who's your supplier?


I don't understand.
I thought we were friends.


The last thing we want
to do is upset bees!


You're too late! It's ours now!


You, sir, have crossed
the wrong sword!


You, sir, will be lunch
for my iguana, Ignacio!


Where is the honey coming from?


Tell me where!


Honey Farms! It comes from Honey Farms!


Orazy person!


What horrible thing has happened here?


These faces, they never knew
what hit them. And now


they're on the road to nowhere!


Just keep still.


What? You're not dead?


Do I look dead? They will wipe anything
that moves. Where you headed?


To Honey Farms.
I am onto something huge here.


I'm going to Alaska. Moose blood,
crazy stuff. Blows your head off!


I'm going to Tacoma.


- And you?
- He really is dead.


All right.


Uh-oh!


- What is that?!
- Oh, no!


- A wiper! Triple blade!
- Triple blade?


Jump on! It's your only chance, bee!


Why does everything have
to be so doggone clean?!


How much do you people need to see?!


Open your eyes!
Stick your head out the window!


From NPR News in Washington,
I'm Oarl Kasell.


But don't kill no more bugs!


- Bee!
- Moose blood guy!!


- You hear something?
- Like what?


Like tiny screaming.


Turn off the radio.


Whassup, bee boy?


Hey, Blood.


Just a row of honey jars,
as far as the eye could see.


Wow!


I assume wherever this truck goes
is where they're getting it.


I mean, that honey's ours.


- Bees hang tight.
- We're all jammed in.


It's a close community.


Not us, man. We on our own.
Every mosquito on his own.


- What if you get in trouble?
- You a mosquito, you in trouble.


Nobody likes us. They just smack.
See a mosquito, smack, smack!


At least you're out in the world.
You must meet girls.


Mosquito girls try to trade up,
get with a moth, dragonfly.


Mosquito girl don't want no mosquito.


You got to be kidding me!


Mooseblood's about to leave
the building! So long, bee!


- Hey, guys!
- Mooseblood!


I knew I'd catch y'all down here.
Did you bring your crazy straw?


We throw it in jars, slap a label on it,
and it's pretty much pure profit.


What is this place?


A bee's got a brain
the size of a pinhead.


They are pinheads!


Pinhead.


- Oheck out the new smoker.
- Oh, sweet. That's the one you want.


The Thomas 3000!


Smoker?


Ninety puffs a minute, semi-automatic.
Twice the nicotine, all the tar.


A couple breaths of this
knocks them right out.


They make the honey,
and we make the money.


"They make the honey,
and we make the money"?


Oh, my!


What's going on? Are you OK?


Yeah. It doesn't last too long.


Do you know you're
in a fake hive with fake walls?


Our queen was moved here.
We had no choice.


This is your queen?
That's a man in women's clothes!


That's a drag queen!


What is this?


Oh, no!


There's hundreds of them!


Bee honey.


Our honey is being brazenly stolen
on a massive scale!


This is worse than anything bears
have done! I intend to do something.


Oh, Barry, stop.


Who told you humans are taking
our honey? That's a rumor.


Do these look like rumors?


That's a conspiracy theory.
These are obviously doctored photos.


How did you get mixed up in this?


He's been talking to humans.


- What?
- Talking to humans?!


He has a human girlfriend.
And they make out!


Make out? Barry!


We do not.


- You wish you could.
- Whose side are you on?


The bees!


I dated a cricket once in San Antonio.
Those crazy legs kept me up all night.


Barry, this is what you want
to do with your life?


I want to do it for all our lives.
Nobody works harder than bees!


Dad, I remember you
coming home so overworked


your hands were still stirring.
You couldn't stop.


I remember that.


What right do they have to our honey?


We live on two cups a year. They put it
in lip balm for no reason whatsoever!


Even if it's true, what can one bee do?


Sting them where it really hurts.


In the face! The eye!


- That would hurt.
- No.


Up the nose? That's a killer.


There's only one place you can sting
the humans, one place where it matters.


Hive at Five, the hive's only
full-hour action news source.


No more bee beards!


With Bob Bumble at the anchor desk.


Weather with Storm Stinger.


Sports with Buzz Larvi.


And Jeanette Ohung.


- Good evening. I'm Bob Bumble.
- And I'm Jeanette Ohung.


A tri-county bee, Barry Benson,


intends to sue the human race
for stealing our honey,


packaging it and profiting
from it illegally!


Tomorrow night on Bee Larry King,


we'll have three former queens here in
our studio, discussing their new book,


Olassy Ladies,
out this week on Hexagon.


Tonight we're talking to Barry Benson.


Did you ever think, "I'm a kid
from the hive. I can't do this"?


Bees have never been afraid
to change the world.


What about Bee Oolumbus?
Bee Gandhi? Bejesus?


Where I'm from, we'd never sue humans.


We were thinking
of stickball or candy stores.


How old are you?


The bee community
is supporting you in this case,


which will be the trial
of the bee century.


You know, they have a Larry King
in the human world too.


It's a common name. Next week...


He looks like you and has a show
and suspenders and colored dots...


Next week...


Glasses, quotes on the bottom from the
guest even though you just heard 'em.


Bear Week next week!
They're scary, hairy and here live.


Always leans forward, pointy shoulders,
squinty eyes, very Jewish.


In tennis, you attack
at the point of weakness!


It was my grandmother, Ken. She's 81.


Honey, her backhand's a joke!
I'm not gonna take advantage of that?


Quiet, please.
Actual work going on here.


- Is that that same bee?
- Yes, it is!


I'm helping him sue the human race.


- Hello.
- Hello, bee.


This is Ken.


Yeah, I remember you. Timberland, size
ten and a half. Vibram sole, I believe.


Why does he talk again?


Listen, you better go
'cause we're really busy working.


But it's our yogurt night!


Bye-bye.


Why is yogurt night so difficult?!


You poor thing.
You two have been at this for hours!


Yes, and Adam here
has been a huge help.


- Frosting...
- How many sugars?


Just one. I try not
to use the competition.


So why are you helping me?


Bees have good qualities.


And it takes my mind off the shop.


Instead of flowers, people
are giving balloon bouquets now.


Those are great, if you're three.


And artificial flowers.


- Oh, those just get me psychotic!
- Yeah, me too.


Bent stingers, pointless pollination.


Bees must hate those fake things!


Nothing worse
than a daffodil that's had work done.


Maybe this could make up
for it a little bit.


- This lawsuit's a pretty big deal.
- I guess.


You sure you want to go through with it?


Am I sure? When I'm done with
the humans, they won't be able


to say, "Honey, I'm home,"
without paying a royalty!


It's an incredible scene
here in downtown Manhattan,


where the world anxiously waits,
because for the first time in history,


we will hear for ourselves
if a honeybee can actually speak.


What have we gotten into here, Barry?


It's pretty big, isn't it?


I can't believe how many humans
don't work during the day.


You think billion-dollar multinational
food companies have good lawyers?


Everybody needs to stay
behind the barricade.


- What's the matter?
- I don't know, I just got a chill.


Well, if it isn't the bee team.


You boys work on this?


All rise! The Honorable
Judge Bumbleton presiding.


All right. Oase number 4475,


Superior Oourt of New York,
Barry Bee Benson v. the Honey Industry


is now in session.


Mr. Montgomery, you're representing
the five food companies collectively?


A privilege.


Mr. Benson... you're representing
all the bees of the world?


I'm kidding. Yes, Your Honor,
we're ready to proceed.


Mr. Montgomery,
your opening statement, please.


Ladies and gentlemen of the jury,


my grandmother was a simple woman.


Born on a farm, she believed
it was man's divine right
