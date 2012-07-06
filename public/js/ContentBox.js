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
		fade: {
			property: 'opacity',
			duration: 200
		},
		resize: {
			property: 'height',
			duration: 250,
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
		
		this.minHeight = this.getMinHeight();
		
		this.fx = {
			fade: new Fx.Tween(this.wrap, this.options.fade),
			resize: new Fx.Tween(this.wrap, this.options.resize)
		}

		this.fx.fade.addEvents({
			start: function(){
				box.fireEvent('fadeStart');
			},
			complete: function(){
				box.fireEvent('fade' + !box.wrap.getStyle('opacity') ? 'Out' : 'In');
			}
		});

		this.fx.resize.addEvents({
			complete: function(){
				if (this.element.getStyle('height').toInt() != box.minHeight) {
					this.element.setStyle('height', 'auto');
				}
				else box.element.getChildren().hide();
			}
		});

	},

	setHeight: function(){
		this.wrap.setStyle('height', this.wrap.getSize().y);
		return this;
	},
	
	getMinHeight: function(){
		var height = this.element.getStyle('minHeight').toInt();
		if (height) Object.each(this.element.getStyles('border-top-width', 'border-bottom-width', 'padding-top', 'padding-bottom'), function(value){
			height += value.toInt() || 0;
		});
		return height;
	},
	
	show: function(limit){
		this.setHeight();
		var limit = limit || this.options.limit;
		this.elements = !limit ? this.element.getChildren() : typeOf(limit) == 'string' ?  this.element.getElements(limit) : $$(limit);
		this.elements.show();
		this.fx.resize.start(this.element.getScrollSize().y);
		this.fx.fade.start(1);
		this.fireEvent('show');
		return this;
	},

	hide: function(fn){
		this.setHeight();
		(fn) ? this.fx.fade.clearChain().cancel().start(0).chain(fn.bind(this)) : this.fx.fade.start(0);
		this.fireEvent('hide');
		return this;
	},
	
	collapse: function(){
		this.setHeight();
		this.fx.fade.start(0);
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