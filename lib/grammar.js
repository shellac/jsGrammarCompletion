var END = new Object();

var uriOrCurie = function(x) {
	return (x.match(/^\?\w+$/)) || // variable
	       (x.match(/^<.*>$/)) ||
	       (x.match(/^\w+:\w+$/)) ;
};

/* Mozilla and chrome seem to freak at bare regex refs in array literal */

var prefix = function(x) { return x.match(/^\w+:$/); };

var svar = function(x) { return x.match(/^\?\w+$/); };

var uriRef = function(x) { return x.match(/^<.*>$/); };

var CONSTRAINED_PROPERTIES = {};
var CONSTRAINED_CLASSES = {};

var sparql = {
    start: [ 'fake', [ 'prefix', 'select', 'ask' ] ],
    prefix: [ 'prefix', ['ns'] ],
    ns: [ prefix  /*/^\w+:$/*/, ['urip'] ],
    urip: [ uriRef /*/^<.*>$/*/, ['prefix', 'select', 'ask'] ],
    select: [ 'select', ['distinct', 'svar', 'star'] ],
    ask: [ 'ask', [ 'body', 'where' ] ],
    distinct: [ 'distinct', ['svar'] ],
    svar: [ svar /*/^\?\w+/*/, [ 'svar', 'body', 'where' ] ],
	star: [ '*', [ 'where', 'body' ] ],
	where: [ 'where', [ 'body' ] ],
	body: [ '{', [ END, 'subject', 'optional', 'block' ], '}', [ END ] ],
    block: [ '{', [ END, 'subject', 'optional', 'block' ], '}', [ END ] ],
	subject: [ uriOrCurie, [ 'a', 'type', 'constrpred', 'predicate' ] ],
	a: [ 'a', [ 'constrklass', 'klass' ] ],
	type: [ 'rdf:type', [ 'constrklass', 'klass' ] ],
	constrklass: [ CONSTRAINED_CLASSES, [ 'comma', 'semi', 'stop' ] ],
	klass: [ uriOrCurie, [ 'comma', 'semi', 'stop' ] ],
	constrpred: [ CONSTRAINED_PROPERTIES, [ 'object' ]],
	predicate: [ uriOrCurie, [ 'object' ]],
	object: [ uriOrCurie, [ 'comma', 'semi', 'stop' ] ],
	stop: [ '.', [ END, 'subject', 'optional' ] ],
	semi: [ ';', [ 'predicate', 'a', 'type' ] ],
	comma: [ ',', [ 'object' ] ],
    optional: [ 'optional', ['block'] ]
};

var labels = {
	ns: 'pre:',
	urip: '<uri>',
	svar: '?var',
	subject: ['ex:subj', '<subj>', '?subj'],
	klass: 'Class',
	predicate: ['ex:prop', '<prop>', '?prop'],
	object: ['ex:obj', '<obj>', '?obj']
}

/* Parse a string, returning an array of suggestions if incomplete */
function parse(test) {
    var tokens = tokenise(test);
    return suggest(tokens, sparql, labels);
}

/* Turn a string into tokens. VERY SIMPLE currently */
function tokenise(string) {
    return string.split(/\s+/);
}

/* Parse tokens using a grammer. Return hints to complete */
function suggest(tokens, grammar, labels) {
    var options = grammar['start'][1];
    var token = tokens.shift();
    var suggestions = run(token, tokens, grammar, options);
	if (suggestions) return processSuggestions(suggestions, grammar, labels);
}

/* Turn next stage of parser into an array of useful hints */
function processSuggestions(suggestions, grammar, labels) {
	var processed = [];
	for (var i in suggestions[0]) {
		var s = suggestions[0][i];
		if ((s === END) && suggestions[1]) { // the close symbol is present, and is usable
			processed.push(suggestions[1]);
		} else { // ok, can we explain what is required?
			var poss = grammar[s][0];
			if (typeof(poss) == 'function') {
				var label = labels[s];
				var ind = false;
				for (ind in label) { processed.push(label[ind]); };
				if (!ind) { processed.push(label); }; // single label case
			}
			else if (typeof(poss) == 'object') {
				for (i in poss) processed.push(i);
			} else processed.push(poss);
		}
			
	}
	return processed;
}

/* Parse token followed by tokens using grammar. options is an array of next steps. closeBit is a close match (such as '}') */
function run(token, tokens, grammar, options, closeBit) {
		
	while (token) {
		
		//println('Token is: ' + token + ' Options are: ' + options);
				
		var nextNode = false;
		
		// Needs fixing. Dead end might have closeBit.
		if (options.length == 0) {
			//println('Grammar dead end, but have stray token: ' + token);
			return false; // quietly die
		}
		
		var mayEnd = false;
		
		for (var i in options) {
	        var option = options[i];
			if (option === END) {
				mayEnd = true;
				continue;
			}
	        var node = grammar[option];
	        if (match(token, node[0])) {
				println('Matched: ' + token + ' to ' + option);
	            nextNode = node;
	            break;
	        }
	    }
		
		if (mayEnd && closeBit && match(token, closeBit)) return false;
		
		if (!nextNode) {
			println('Nowhere to go! Options are: ' + options + ' token is ' + token + ' close: ' + closeBit + " mayEnd " + mayEnd);
			exit();
			return false; // quietly die
		}

		token = tokens.shift();

		options = nextNode[1];
		
		var endBit = nextNode[2];
		if (endBit) { // enter a delimited region. recurse.
			var result = run(token, tokens, grammar, options, endBit );
			if (result) return result; // out of tokens, return suggested next steps
			options = nextNode[3];
			token = tokens.shift();
		}		
	}
	
	if (moreToDo(options) || closeBit) {
		//println('Exhausted tokens with some work still to do: ' + options + ' ' + closeBit);
		return [options, closeBit];
	}
}

function moreToDo(options) {
	if (options.length == 0) return false;
	for (i in options) {
		if (options[i] === END) return false;
	}
	return true;
}

/* Match a token against either a string, object, or function (such as a regex) */
function match(token, object) {
	if (typeof(object) == 'string') //return object == token.toLowerCase(); // this is a problem
	            return (object.indexOf(token.toLowerCase()) == 0); // starts with
	if (typeof(object) == 'function') return object(token);
	if (typeof(object) == 'object') return object[token];
	throw 'Not sure how to match against: ' + object;
}

parse('select ?foo ?bar { x:a x:b x:c . }');
println('++++++++++');
parse('select ?foo ?bar where { optional { x:a x:b x:c , x:d . } }');
println('++++++++++');
parse('select distinct ?foo ?bar { { x:a x:b x:c ; x:e x:f . } }');
println('++++++++++');
var suggestions = parse('select * { x:a ');
println('Suggested: ' + suggestions);
