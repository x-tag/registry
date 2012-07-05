
(function(){
	
	[Events, Request, Request.JSON].each(function(klass){
		Class.refactor(klass, {
			addCallbacks: function(events){
				Object.each(events, function(fn, key){
					this.addEvent(key + ':once', fn);
				}, this);
				return this;
			}
		});
	});

})();