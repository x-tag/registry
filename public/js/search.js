(function(){

	TagResult = new Class({

		Extends: Template,

		Template: {
			name: 'TagResult',
			html: '<dd class="{resultClass}" id="{author}-{repo_name}">' +
				'{demo_link}' +
				'<div class="tag-header">' +
					'<h3>' +
						'<a class="tag-name" href="{author}/{repo_name}/{tag_name}/view">{name}</a>' +
						'<span class="tag-author">by <a target="_blank" href="http://github.com/{author}/{repo_name}">{author}</a></span>' +
						'{forked_link}' +
						'<span class="tag-version">latest <a href="{author}/{repo_name}/{tag_name}/{version}/view">{version}&#9662;</a></span>' +
					'</h3>' +
					'<nav class="tag-categories"></nav>' +
					'{issues_link}' +
				'</div>' +
				'<p class="tag-description">{description}</p>' +
				'<ul class="tag-compatibility"></ul>' +
				'<ul class="tag-version-list"></ul>' +
			'</dd>'
		},

		createElement: function(data) {
			if (!data) return this;
			if (data.demo_url) {
				data.demo_link = '<a class="tag-demo" href="/' + data.author + '/' + data.repo_name + '/' + data.tag_name + '/demo"></a>';
			}
			if (data.forked){
				var originalAuthor = data.forked_from.split('/')[3];
				data.forked_link = '<span class="tag-forked">fork of <a target="_blank" href="'+ data.forked_from +'">'+originalAuthor+'</a></span>';
			}
			if (data.issues && data.issues.issues.count){
				var totalIssues = data.issues.issues.count;
				data.issues_link = '<nav class="tag-issues">issues ';
				['bug', 'enhancement', 'pull_request'].forEach(function(issue_type){
					if (!data.issues[issue_type] || !data.issues[issue_type].count) return;
					totalIssues -= count;
					var count = data.issues[issue_type] ? data.issues[issue_type].count : 0;
					data.issues_link += '<a target="_blank" title="' + issue_type +
					'" class="'+issue_type+'" href="' + data.repo + '/issues">' +
					count + '</a>';
				});
				if (totalIssues>0){
					data.issues_link += '<a target="_blank" title="other"' +
					'" class="other_issue" href="' + data.repo + '/issues">' +
					totalIssues + '</a>';
				}
				data.issues_link += '</nav>';
			}

			this.parent(data);

			var categoryList = this.element.getElement('nav.tag-categories');
			(data.category || []).each(function(category){
				new Element('a', {
					html: '<b>' + category + '</b>'
				}).inject(categoryList);
			});

			var compatibilityList = this.element.getElement('ul.tag-compatibility');
			Object.each(data.compatibility, function(value, key){
				new Element('li', {
					'class': 'browser ' + key,
					text: value
				}).inject(compatibilityList);
			});

			return this;
		}

	});

	TagSearch = new Class({

		Extends: ContentBox,

		Binds: ['search'],

		Plugins: {
			searchRequest: Request.JSON
		},

		options: {
			searchRequest: {
				url: '/search',
				onSuccess: function(response){
					this.data = response.data;
					if (this.data.length) this.base['groupBy' + $('groups').getElement('input:checked').value.capitalize()]();
					else this.base.wrap.addClass('no-results');
				}
			}
		},

		getQuery: function(){
			var query = {
				forked: $('include_forks').checked,
				'compatibility[ie]': $('ie9_compat').checked ? 9 : null,
				author: $('official_tags').checked ? 'mozilla' : null
			};
			category = [];
			query.query = $('search_input').value.replace(/#(\w+)/g, function(match,group1,idx){
				category.push(group1);
				return '';
			});
			console.log(category);
			query.category = category.join(',');
			return query;
		},

		search: function(){
			var self = this,
				query = this.getQuery();
			if (Object.equals(query, this.lastQuery)) return this;
			this.lastQuery = query;
			this.wrap.removeClass('no-results');
			this.collapse(function(){
				self.element.empty();
				self.searchRequest.get(query);
			});
			return this;
		},

		blink: function(fn){
			this.collapse(function(){
				fn.call(this);
				this.show();
			});
			return this;
		},

		groupByDefault: function(){
			this.blink(function(){
				this.element.empty();
				this.searchRequest.data.each(function(result){
					new TagResult().createElement(result).element.inject(this.element);
				}, this);
			});
		},

		groupByCategory: function(){
			this.blink(function(){
				var self = this,
					categories = {};

				this.element.empty();
				this.searchRequest.data.each(function(result){
					result.category.each(function(category){
						result.resultClass = 'result-category-' + category;
						new TagResult().createElement(result).element.inject(categories[category] = categories[category] || new Element('dt').inject(self.element), 'after');
					});
					Object.each(categories, function(element, category){
						element.set('html', category.capitalize() + ' <span>(' + $$('.result-category-' + category).length + ')</span>');
					});
				});
			});
		},

		groupByAuthor: function(){
			this.blink(function(){
				var self = this,
					authors = {};
				this.element.empty();
				this.searchRequest.data.each(function(result){
					result.resultClass = 'result-author-' + result.author;
					new TagResult().createElement(result).element.inject(authors[result.author] = authors[result.author] || new Element('dt').inject(self.element), 'after');
				});
				Object.each(authors, function(element, author){
					element.set('html', '<a href="https://github.com/' + author + '">' + author + '</a> <span>(' + $$('.result-author-' + author).length + ')</span>');
				});
			});
		}

	});

	var advancedBox = new ContentBox($('advanced_controls').getFirst(), { wrap: $('advanced_controls') });
	RegistrySearch = new TagSearch('results').search();

	window.addEvents({
		'keydown:relay(#search_input):keys(enter)': RegistrySearch.search,
		'click:relay(#search_button)': RegistrySearch.search,
		'click:relay(#advanced_controls button)': function(){
			var input = this.getPrevious();

			if (input.type == 'radio' && !input.checked){
				input.checked = true;
				RegistrySearch['groupBy' + input.value.capitalize()]();
			}
			else if (input.type == 'checkbox'){
				input.checked = !input.checked;
			}
		},
		'click:relay(#advanced_button)': function(){
			var shown = $('advanced_controls').getStyle('height') == 'auto';
			this[shown ? 'removeClass' : 'addClass']('pressed');
			advancedBox[shown ? 'collapse' : 'show']();
		},
		'click:relay(#filters button)': function(){
			RegistrySearch.search();
		},
		'click:relay(#add_tag_button)': function(){

			var match = $('tag_repo').value.match(
				/https?:\/\/github.com\/([\w-_]+)\/([\w-_]+)/);

			if (!match){
				$('tag_repo_message').innerText = 'Invalid github repository.';
				return;
			}

			var req = new Request.JSON({
				url: '/customtag/add',
				onRequest: function(){
					$('tag_repo_message').innerText = 'Processing repository';
				},
				onFailure: function(err){
					$('tag_repo_message').innerText = err;
					setTimeout(function(){
						$('tag_repo_message').innerText = '';
					},10000);
				},
				onSuccess: function(data){
					if (data.success){
						var existing = $(match[1] + '-' + match[2]);
						if (existing){
							existing.addClass('new_tag');
							$('tag_repo_message').innerText = 'Repository updated.';
							existing.inject($('results').children[0],'before');
						} else {
							var elem = new TagResult().createElement({
									resultClass: 'new_tag',
									author: data.repo.author,
									repo_name: data.repo.author,
									tag_name: data.repo.title,
									name: data.xtag_json.name,
									version: data.xtag_json.version,
									description: data.xtag_json.description
								}).element;
							elem.inject($('results').children[0],'before');
							$('tag_repo').value = '';
							$('tag_repo_message').innerText = 'Repository Added';
						}
					}
					else if(data.error){
						$('tag_repo_message').innerText = data.error;
					}
					else {
						$('tag_repo_message').innerText = 'An error occured, please file a github issue for x-tag/registry';
					}
					setTimeout(function(){
						$('tag_repo_message').innerText = '';
					},15000);
				}
			});
			req.post({repo: $('tag_repo').value });
		}
	});

	RegistryKeyboard = new Keyboard({
		defaultEventType: 'keyup',
		events: {
			'keydown:shift': function(){
				this.shiftDown = true;
			},
			'shift': function(){
				this.shiftDown = false;
			}
		}
	}).activate();

})();