/*** Native Type Extensions ***/
(function(){

	var hasOwnProperty = Object.prototype.hasOwnProperty;
	Object.extend({

		first: function(object, fn, bind){
			for (var key in object){
				if (Object.prototype.hasOwnProperty.call(object, key) && fn.call(bind, object[key], key)) return object[key];
			}
			return null;
		},

		get: function(object, path){
			if (typeof path == 'string') path = path.split('.');
			for (var i = 0, l = path.length; i < l; i++){
				if (hasOwnProperty.call(object, path[i])) object = object[path[i]];
				else return object[path[i]];
			}
			return object;
		},
		
		set: function(object, path, value){
			var path = path.split ? path.split('.') : path,
				key = path.pop(),
				len = path.length,
				i = 0,
				current;
			while (len--){
				current = path[i++];
				object = current in object ? object[current] : (object[current] = {});
			}
			object[key] = value;
		},
		
		'equals': function(first, second){
			if (first === second) return true;
			var type = typeOf(first),
				every = Array.every;
			if (type != typeOf(second)) return false;
			switch (type){
				case 'string': case 'regexp': return String(first) == String(second);
				case 'date': return first.getTime() == second.getTime();
				case 'arguments':
					first = Array.from(first);
					second = Array.from(second);
				case 'object': every = Object.every;
				case 'array': case 'object': case 'arguments':
					if (first.length != second.length) return false;
					return every(first, function(value, i){
						return (i in second) && Object.equals(value, second[i]);
					});
			}
			return true;
		},
		
		bindMap: function(object, bind){
			return Object.map(object, function(value){
				return (typeof value == 'function') ? value.bind(bind) : value; 
			});
		}
		
	});
	
	Function.implement({
		
		test: function(test){
			var original = this,
				test = Function.from(test);
			return function(){
				var args = Array.from(arguments);
				if (test.apply(this, args) !== false) return original.apply(this, args);
			}
		}
		
	});

	String.implement({
		
		substitute: function(object, regexp) {
			return String(this).replace(regexp || (/\\?\{([^{}]+)\}|%7B([^%7B,%7D]+)\%7D/g), function(match, name1, name2) {
				var name = name1 || name2;
				if (match.charAt(0) == '\\') return match.slice(1);
				if (object[name] != undefined) return object[name];
				var path = name.split('.'),
					length = path.length;
					sub = object;
				for (var i = 0, length; i < length; i++) {
					if((sub = sub[path[i]]) == undefined) return '';
				}
				return sub;
			});
		}

	});
	
	/*** Class & Mutator Extensions ***/
	
	Class.implement('addInitializer', function(name, when, fn){
		this.prototype.$initializers = this.prototype.$initializers || { after: {}, before: {} };
		this.prototype.$initializers[when][name] = fn;
	});
	
	Class.Mutators.initialize = function(initialize){
		return function(){
			var args = Array.from(arguments),
				init = this.$initializers || { after: {}, before: {} };
				
			if (!this.$intialized) for (var z in init.before) init.before[z].apply(this, args);
			
			var returns = Function.from(initialize).apply(this, args);
			
			if (!this.$intialized){
				for (var z in init.after) init.after[z].apply(this, args);
				this.$intialized = true;
			}
			
			return returns;
		}
	};
	
	Class.Mutators.Plugins = function(plugins){
		this.addInitializer('Plugins', 'after', function(){
			var self = this,
				instances = {};
			
			for (name in this.Plugins){
				var plugin = this.Plugins[name],
					instance = new plugin(self.options[name] || {});
				instance.base = self;
				instances[name] = instance;
				self[name] = instance;
			};
		
			this.plugins = function(key, args){
				var args = Array.from(args);
				return Object.map(this.plugins.instances, function(instance){
					if (typeof instance[key] == 'function') return instance[key].apply(instance, args);
				});
			}.extend({
				instances: instances,
				get: function(name){
					return this.instances[name] || null;
				}
			});
		});
		return Object.merge({}, this.prototype.Plugins || {}, plugins);
	};

})();