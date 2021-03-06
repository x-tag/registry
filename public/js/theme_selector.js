document.addEventListener('DOMComponentsLoaded', function(){
	var select = document.querySelector('select.themes');
	if (select){
		select.addEventListener('change', function(){
			var opt = this.options[this.selectedIndex];
			var css = document.getElementById('element_theme');
			if (!css){
				css = document.createElement('link');
				css.setAttribute('id', 'element_theme');
				css.setAttribute('rel', 'stylesheet');
				css.setAttribute('type', 'text/css');
				document.getElementsByTagName('head')[0].appendChild(css);
			}
			css.setAttribute('href', "assets/" + elementId + "/themes/" + opt.value);
		});
	}
})