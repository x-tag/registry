var ContentBox = new Class({

	Implements: [Events, Chain, Options],

	options: {
		wrap: null,
		limit: '',
		delay: 25,
		styles: {
			'float': true,
			clear: true,
			margin: true,
			opacity: true
		},
		fx: {
			duration: 250,
		},
		fade: {
			property: 'opacity',
		},
		resize: {
			property: 'height',
			transition: 'quad:out'
		} 
	},

	initialize: function(element, options){
		var box = this;
		this.setOptions(options);
		this.element = $(element).store('ContentBox', this);
		this.wrap = ($(this.options.wrap) || new Element('div'))
			.addClass('content-box')
			.setStyles(this.element.getStyles.apply(
				this.element,
				Object.keys(Object.filter(this.options.styles, function(value){ return value; }))
			))
			.setStyle('overflow', 'hidden');
			
		this.element.setStyle('margin', 'auto');
		if (!this.options.wrap) this.wrap.wraps(this.element);
		
		this.setMinHeight();
		
		this.fx = {
			fade: new Fx.Tween(this.element, Object.merge({}, this.options.fade, this.options.fx)),
			resize: new Fx.Tween(this.wrap, Object.merge({}, this.options.resize, this.options.fx))
		}

		this.fx.fade.addEvents({
			start: function(){
				box.fireEvent('fadeStart');
			},
			complete: function(){
				var opacity = this.element.getStyle('opacity');
				if (opacity) box.wrap.setStyle('height', 'auto');
				else this.element.getChildren().hide();
				box.fireEvent('fade' + (opacity ? 'In' : 'Out'));
			}
		});

	},

	setHeight: function(){
		this.wrap.setStyle('height', this.wrap.getSize().y);
		return this;
	},
	
	setMinHeight: function(){
		if (this.element.getStyle('minHeight')) {
			var children = this.element.getChildren(),
				minHeight = this.element.empty().getSize().y;
			this.element.adopt(children);
		}
		this.minHeight = minHeight || 0;
		return this;
	},
	
	show: function(limit){
		this.setHeight();
		var limit = limit || this.options.limit;
		this.elements = !limit ? this.element.getChildren() : typeOf(limit) == 'string' ?  this.element.getElements(limit) : $$(limit);
		this.elements.show();
		this.fx.fade.start(1);
		this.fx.resize.start(this.element.getScrollSize().y);
		this.fireEvent('show');
		return this;
	},

	hide: function(fn){
		this.setHeight();
		this.fx.fade.start(0);
		if (fn) this.fx.fade.addEvent('complete:once', fn.bind(this));
		this.fireEvent('hide');
		return this;
	},
	
	collapse: function(fn){
		this.hide(fn);
		this.fx.resize.start(this.minHeight);
		this.fireEvent('collapse');
		return this;
	},

	expose: function(selector){
		this.hide(function(){
			this.element.getChildren().hide();
			this.show(selector);
		});
		return this;
	},

	sort: function(selector, fn) {
		this.hide(function(){
			this.sorted = selector ? [selector, fn] : this.sorted;
			this.element.getChildren().hide();
			this.element.adopt(this.element.getElements(this.sorted[0]).sort(this.sorted[1]));
			this.show();
		});
		return this;
	},
	
	filter: function(elements){
		return elements.filter(function(el){ return !this.element.contains(el); }, this);
	},
	
	adopt: function(nodes, where){
		if(!nodes) return this;
		
		var elements = this.filter(nodes.charAt ? Elements.from(nodes) : $$(nodes));
		
		if(elements[0]) {
			elements.hide().inject(this.setHeight().element, where);
			this[this.sorted ? 'sort' : 'show']();
			this.fireEvent('adopt');
		}

		return this;
	},
	
	toElement: function(){
		return this.element;
	}

});

/* ContentBox Request extension */

ContentBox.Request = new Class({
	
	Extends: ContentBox,
	
	options: {
		request: {
			//url: '',
			type: 'JSON',
			onSuccess: function(json){
				console.log(json) //this.adopt(RENDERED ELEMENTS HERE);
			}
		}
	},
	
	initialize: function(element, options){
		this.setOptions(options);
		this.parent(element, options);
		var request = Object.bindMap(this.options.request, this);
		this.request = (request.type) ? new Request[request.type](request) : new Request(request);
	},
	
	send: function(options){
		this.request.send(Object.bindMap(options || {}, this));
		return this;
	},

	cancel: function(){
		this.request.cancel();
		return this;
	}
	
});