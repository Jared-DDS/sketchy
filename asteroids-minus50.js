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