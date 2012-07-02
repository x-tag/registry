
(function(){

	/*** Native Type Extensions ***/

	Object.merge(Element.NativeEvents, {
		drag: 2,
		dragend: 2
	});

	String.implement({
		inject: function(element){
			var temp = new Element('div', { html: this }),
				first = temp.getFirst(); 
			first ? $(first).inject(element) : element.set('html', this);
			temp.destroy();
			return first;
		},
		tagify: function(regexp, tag, fn){
			var string = this;
			return String(this).replace(regexp || /\B\@([\w\-]+)/gim, function(){
				return new Element(tag, Function.from(fn).apply(string, Array.from(arguments))).toHTML();
			});
		},
		linkMentions: function(){
			return this.tagify(null, 'a', function(match, username){
				return {
					text: match,
					href: '/user/' + username
				}
			});
		}
	})


	/*** Class Mutators ***/
	
	var bindListener = function(self, key, listener){
		if (typeof listener == 'function') self.listeners[key] = function(){;
			var args = Array.from(arguments);
			args.unshift(this);
			listener.apply(self, args);
		}
	};
	
	Class.Mutators.Listeners = function(listeners){
		this.prototype.attach = function(element){
			this.detach();
			for (var z in this.Listeners) bindListener(this, z, this.Listeners[z]);
			this.attached = (element || this.element).addEvents(this.listeners);
		}
		
		this.prototype.detach = function(){
			if (this.attached) this.attached.removeEvents(this.listeners);
			this.listeners = {};
		}
		
		return Object.merge(this.prototype.Listeners || {}, listeners);
	};

	/*** Element Extensions ***/

	Element.implement({
		toInstance: function(name, options){
			var instance = this.retrieve(name) || new window[name](this, options || {});
			this.store(name, instance);
			return instance; 
		},
		toHTML: function(retain){
			var next = this.getNext(),
				spot = (next) ? [next, 'before'] : [this.getParent()],
				wrapper = new Element('div'),
				html = wrapper.grab(this).get('html');
			if(retain) this.inject.apply(this, spot);
			wrapper.destroy();
			return html;
		},
		getComputedStyles: function(property){
			var computed = this.currentStyle || window.getComputedStyle(this), styles = {};
			if (Browser.chrome || Browser.safari) {
				computed.cssText.split('; ').each(function(e){
					var style = e.split(': ');
					styles[style[0].camelCase()] = style[1];
				});
			}
			else for (z in computed) if(isNaN(z) && typeof computed[z] != 'function') styles[z] = computed[z];
			delete styles.cssText;
			if (property) styles = Object.subset(styles, Array.from(property));
			return styles;
		},
		diffuse: function(position, margin){
			margin = typeof margin != 'undefined' ? margin : 0;
			return this.setStyles({
				position: position || 'absolute',
				top: margin,
				bottom: margin,
				left: margin,
				right: margin
			});
		},
		seal: function(){
			if (this.getStyle('position') == 'static') this.setStyle('position', 'relative');
			return this;
		}
	});

})();