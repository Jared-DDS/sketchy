//flame-->wave
//fire-->water
//enemy-->bear
//enemies-->bears
//asteroid-->butter
//bullet-->flower
//


// See license: https://github.com/erkie/erkie.github.com/blob/master/README
// Modified for the Atom editor environment by Tom Preston-Werner.

startbutters = function() {
function butters() {
	if ( ! window.butterS )
		window.butterS = {
			bearsKilled: 0,
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
	var flowerSpeed	  = 700;
	var elephantSpeed = 400;

	var timeBetweenwater = 150; // how many milliseconds between shots
	var timeBetweenBlink = 250; // milliseconds between bear blink
	var timeBetweenbearUpdate = 2000;
	var flowerRadius = 2;
	var maxelephants = 40;
	var maxflowers = 20;

	// generated every 10 ms
	this.wave = {r: [], y: []};

	// blink style
	this.toggleBlinkStyle = function () {
		if (this.updated.blink.isActive) {
			removeClass(document.body, 'butterSBLINK');
		} else {
			addClass(document.body, 'butterSBLINK');
		}

		this.updated.blink.isActive = !this.updated.blink.isActive;
	};

	addStylesheet(".butterSBLINK .butterSYEAHbear", "outline: 2px dotted red;");

	this.pos = new Vector(100, 100);
	this.lastPos = false;
	this.vel = new Vector(0, 0);
	this.dir = new Vector(0, 1);
	this.keysPressed = {};
	this.waterdAt = false;
	this.updated = {
		bears: false, // if the bear index has been updated since the user pressed B for Blink
		wave: new Date().getTime(), // the time the wave was last updated
		blink: {time: 0, isActive: false}
	};
	this.scrollPos = new Vector(0, 0);

	this.flowers = [];

	// bears lay first in this.bears, when they are shot they are moved to this.dying
	this.bears = [];
	this.dying = [];
	this.totalbears = 0;

	// elephants are created when something is shot
	this.elephants = [];

	// things to shoot is everything textual and an element of type not specified
	// in types AND not a navigation element (see further down)
	function updatebearIndex() {
		for ( var i = 0, bear; bear = that.bears[i]; i++ )
			removeClass(bear, "butterSYEAHbear");

		var all = document.body.getElementsByTagName('*');
		that.bears = [];
		for ( var i = 0, el; el = all[i]; i++ ) {
			// elements with className butterSYEAH are part of the "game"
			if ( indexOf(ignoredTypes, el.tagName.toUpperCase()) == -1 && el.prefix != 'g_vml_' && hasOnlyTextualbears(el) && el.className != "butterSYEAH" && el.offsetHeight > 0 ) {
				el.aSize = size(el);
				that.bears.push(el);

				addClass(el, "butterSYEAHbear");

				// this is only for bearcounting
				if ( ! el.aAdded ) {
					el.aAdded = true;
					that.totalbears++;
				}
			}
		}
	};
	updatebearIndex();

	// createwaves create the vectors for the waves of the ship
	var createwaves;
	(function () {
		var rWidth = playerWidth,
			rIncrease = playerWidth * 0.1,
			yWidth = playerWidth * 0.6,
			yIncrease = yWidth * 0.2,
			halfR = rWidth / 2,
			halfY = yWidth / 2,
			halfPlayerHeight = playerHeight / 2;

		createwaves = function () {
			// Firstly create red waves
			that.wave.r = [[-1 * halfPlayerHeight, -1 * halfR]];
			that.wave.y = [[-1 * halfPlayerHeight, -1 * halfY]];

			for ( var x = 0; x < rWidth; x += rIncrease ) {
				that.wave.r.push([-random(2, 7) - halfPlayerHeight, x - halfR]);
			}

			that.wave.r.push([-1 * halfPlayerHeight, halfR]);

			// ... And now the yellow waves
			for ( var x = 0; x < yWidth; x += yIncrease ) {
				that.wave.y.push([-random(2, 7) - halfPlayerHeight, x - halfY]);
			}

			that.wave.y.push([-1 * halfPlayerHeight, halfY]);
		};
	})();

	createwaves();

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
		for ( var i = 0, p; p = window.butterSPLAYERS[i]; i++ ) {
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

	function addelephants(startPos) {
		var time = new Date().getTime();
		var amount = maxelephants;
		for ( var i = 0; i < amount; i++ ) {
			that.elephants.push({
				// random direction
				dir: (new Vector(Math.random() * 20 - 10, Math.random() * 20 - 10)).normalize(),
				pos: startPos.cp(),
				cameAlive: time
			});
		}
	};

	function hasOnlyTextualbears(element) {
		if ( element.offsetLeft < -100 && element.offsetWidth > 0 && element.offsetHeight > 0 ) return false;
		if ( indexOf(hiddenTypes, element.tagName) != -1 ) return true;

		if ( element.offsetWidth == 0 && element.offsetHeight == 0 ) return false;
		for ( var i = 0; i < element.bearNodes.length; i++ ) {
			// <br /> doesn't count... and empty elements
			if (
				indexOf(hiddenTypes, element.bearNodes[i].tagName) == -1
				&& element.bearNodes[i].bearNodes.length != 0
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
		stylesheet.id = 'butterSYEAHSTYLES';
		try {
			stylesheet.innerHTML = selector + "{" + rules + "}";
		} catch ( e ) {
			stylesheet.styleSheet.addRule(selector, rules);
		}
		document.getElementsByTagName("head")[0].appendbear(stylesheet);
	};

	function removeStylesheet(name) {
		var stylesheet = document.getElementById(name);
		if ( stylesheet ) {
			stylesheet.parentNode.removebear(stylesheet);
		}
	};

	/*
		== Setup ==
	*/
	this.gameContainer = document.createElement('div');
	this.gameContainer.className = 'butterSYEAH';
	document.body.appendbear(this.gameContainer);

	this.canvas = document.createElement('canvas');
	this.canvas.setAttribute('width', w);
	this.canvas.setAttribute('height', h);
	this.canvas.className = 'butterSYEAH';
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
		document.body.appendbear(message);

		var x = e.pageX || (e.clientX + document.documentElement.scrollLeft);
		var y = e.pageY || (e.clientY + document.documentElement.scrollTop);
		message.style.left = x - message.offsetWidth/2 + 'px';
		message.style.top = y - message.offsetHeight/2 + 'px';

		setTimeout(function() {
			try {
				message.parentNode.removebear(message);
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

	this.gameContainer.appendbear(this.canvas);
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
				that.waterdAt = 1;
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

	this.ctx.drawflowers = function(flowers) {
		for ( var i = 0; i < flowers.length; i++ ) {
			this.beginPath();
			this.fillStyle = "red";
			this.arc(flowers[i].pos.x, flowers[i].pos.y, flowerRadius, 0, PI_SQ, true);
			this.closePath();
			this.fill();
		}
	};

	var randomelephantColor = function() {
		return (['red', 'yellow'])[random(0, 1)];
	};

	this.ctx.drawelephants = function(elephants) {
		var oldColor = this.fillStyle;

		for ( var i = 0; i < elephants.length; i++ ) {
			this.fillStyle = randomelephantColor();
			this.drawLine(elephants[i].pos.x, elephants[i].pos.y, elephants[i].pos.x - elephants[i].dir.x * 10, elephants[i].pos.y - elephants[i].dir.y * 10);
		}

		this.fillStyle = oldColor;
	};

	this.ctx.drawwaves = function(wave) {
		if ( THEPLAYER ) return;

		this.save();

		this.translate(that.pos.x, that.pos.y);
		this.rotate(that.dir.angle());

		var oldColor = this.strokeStyle;
		this.strokeStyle = "red";
		this.tracePoly(wave.r);
		this.stroke();

		this.strokeStyle = "yellow";
		this.tracePoly(wave.y);
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

	addelephants(this.pos);
	addClass(document.body, 'butterSYEAH');

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

		// update wave and timer if needed
		var drawwave = false;
		if ( nowTime - this.updated.wave > 50 ) {
			createwaves();
			this.updated.wave = nowTime;
		}

		this.scrollPos.x = window.pageXOffset || document.documentElement.scrollLeft;
		this.scrollPos.y = window.pageYOffset || document.documentElement.scrollTop;

		// update player
		// move forward
		if ( (this.keysPressed[code('up')]) || (this.keysPressed[code('W')]) ) {
			this.vel.add(this.dir.mulNew(acc * tDelta));

			drawwave = true;
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

		// water
		if ( this.keysPressed[code(' ')] && nowTime - this.waterdAt > timeBetweenwater ) {
			this.flowers.unshift({
				'dir': this.dir.cp(),
				'pos': this.pos.cp(),
				'startVel': this.vel.cp(),
				'cameAlive': nowTime
			});

			this.waterdAt = nowTime;

			if ( this.flowers.length > maxflowers ) {
				this.flowers.pop();
			}
		}

		// add blink
		if ( this.keysPressed[code('B')] ) {
			if ( ! this.updated.bears ) {
				updatebearIndex();
				this.updated.bears = true;
			}

			forceChange = true;

			this.updated.blink.time += tDelta * 1000;
			if ( this.updated.blink.time > timeBetweenBlink ) {
				this.toggleBlinkStyle();
				this.updated.blink.time = 0;
			}
		} else {
			this.updated.bears = false;
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

		// update positions of flowers
		for ( var i = this.flowers.length - 1; i >= 0; i-- ) {
			// flowers should only live for 2 seconds
			if ( nowTime - this.flowers[i].cameAlive > 2000 ) {
				this.flowers.splice(i, 1);
				forceChange = true;
				continue;
			}

			var flowerVel = this.flowers[i].dir.setLengthNew(flowerSpeed * tDelta).add(this.flowers[i].startVel.mulNew(tDelta));

			this.flowers[i].pos.add(flowerVel);
			boundsCheck(this.flowers[i].pos);

			// check collisions
			var murdered = getElementFromPoint(this.flowers[i].pos.x, this.flowers[i].pos.y);
			if (
				murdered && murdered.tagName &&
				indexOf(ignoredTypes, murdered.tagName.toUpperCase()) == -1 &&
				hasOnlyTextualbears(murdered) && murdered.className != "butterSYEAH"
			) {
				didKill = true;
				addelephants(this.flowers[i].pos);
				this.dying.push(murdered);

				this.flowers.splice(i, 1);
				continue;
			}
		}

		if (this.dying.length) {
			for ( var i = this.dying.length - 1; i >= 0; i-- ) {
				try {
					// If we have multiple spaceships it might have already been removed
					if ( this.dying[i].parentNode )
						window.butterS.bearsKilled++;

					this.dying[i].parentNode.removebear(this.dying[i]);
				} catch ( e ) {}
			}

			this.dying = [];
		}

		// update elephants position
		for ( var i = this.elephants.length - 1; i >= 0; i-- ) {
			this.elephants[i].pos.add(this.elephants[i].dir.mulNew(elephantSpeed * tDelta * Math.random()));

			if ( nowTime - this.elephants[i].cameAlive > 1000 ) {
				this.elephants.splice(i, 1);
				forceChange = true;
				continue;
			}
		}

		// ==
		// drawing
		// ==

		// clear
		if ( forceChange || this.flowers.length != 0 || this.elephants.length != 0 || ! this.pos.is(this.lastPos) || this.vel.len() > 0 ) {
			this.ctx.clear();

			// draw player
			this.ctx.drawPlayer();

			// draw waves
			if ( drawwave )
				this.ctx.drawwaves(that.wave);

			// draw flowers
			if (this.flowers.length) {
				this.ctx.drawflowers(this.flowers);
			}

			// draw elephants
			if (this.elephants.length) {
				this.ctx.drawelephants(this.elephants);
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
		removeStylesheet("butterSYEAHSTYLES");
		removeClass(document.body, 'butterSYEAH');
		this.gameContainer.parentNode.removebear(this.gameContainer);
	};
}

if ( ! window.butterSPLAYERS )
	window.butterSPLAYERS = [];

window.butterSPLAYERS[window.butterSPLAYERS.length] = new butters();

};
