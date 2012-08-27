(function(){
	
	var instructions = new ContentBox($('instructions').getFirst(), { wrap: $('instructions') });
	window.addEvents({
		'click:relay(#toggleInstructions)': function(){
			var shown = $('instructions').getStyle('height') == 'auto';			
			instructions[shown ? 'collapse' : 'show']();
		}
	});

	hljs.tabReplace = '    ';
	hljs.initHighlightingOnLoad();
	
})();