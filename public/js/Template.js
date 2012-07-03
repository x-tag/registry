
(function(){

	var extendElement = function(element, data){
		Object.each(this.options.template.extensions, function(options){
			var inject = Array.from(options.inject);
			Elements.from(data ? options.html.substitute(data) : options.html)[0].inject(element.getElement(inject[0] || ''), inject[1]);
		});
		return element;
	}

	Class.Mutators.Template = function(template){
		template = Object.merge({}, this.prototype.Template || {}, template);
		if (template.extensions) template.html = extendElement.call({
			options: { template: { extensions: template.extensions } }
		}, Elements.from(template.html)[0]).toHTML();
		delete template.extensions;
		return template;
	}
	
	Template = new Class({
		
		Implements: [Events],
		
		Plugins: {
			request: Request.JSON
		},
		
		Template: {
			name: '',
			html: '',
			extensions: null
		},
		
		options: {
			template: {
				data: {},
				extensions: {}
			}
		},
		
		initialize: function(element, options){
			this.setOptions(element, options);
			if ($(element) && !this.element) this.createElement(element);
		},
		
		setOptions: function(element){
			var args = Array.from(arguments).filter(function(object){ return !$(object); });
			return Options.prototype.setOptions.apply(this, args);
		},
		
		createElement: function(data){
			console.log(data);
			this.data = Object.merge({}, this.options.template.data, $(data) ? {} : data);
			this.element = $(data) || this.extendElement(Elements.from(this.Template.html.substitute(this.data))[0], this.data);
			this.element.store(this.Template.name, this);
			this.fireEvent('create');
			return this;
		},
		
		extendElement: extendElement
		
	});

})();