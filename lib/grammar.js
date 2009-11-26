var EMPTY = new Object();

var uriOrCurie = function(x) {
	return (x.match(/^<.*>$/)) ||
	       (x.match(/^\w+:\w+$/));
};

var sparql = {
    start: [ 'fake', [ 'prefix', 'select', 'ask' ] ],
    prefix: [ 'prefix', ['ns'] ],
    ns: [ /^\w+:$/, ['urip'] ],
    urip: [ /^<.*>$/, ['prefix', 'select', 'ask'] ],
    select: [ 'select', ['distinct', 'svar', 'star'] ],
    ask: [ 'ask', [ 'body', 'where' ] ],
    distinct: [ 'distinct', ['svar'] ],
    svar: [ /^\?\w+/, [ 'svar', 'body', 'where' ] ],
	star: [ '*', [ 'where', 'body' ] ],
	where: [ 'where', [ 'body' ] ],
	body: [ '{', [ EMPTY, 'subject', 'optional', 'block' ], '}', [] ],
    block: [ '{', [ EMPTY, 'subject', 'optional', 'block' ], '}', [ EMPTY ] ],
	subject: [ uriOrCurie, [ 'a', 'type', 'predicate' ] ],
	a: [ 'a', [ 'klass' ] ],
	type: [ 'rdf:type', [ 'klass' ] ],
	klass: [ uriOrCurie, [ 'comma', 'semi', 'stop' ] ],
	predicate: [ uriOrCurie, [ 'object' ]],
	object: [ uriOrCurie, [ 'comma', 'semi', 'stop' ] ],
	stop: [ '.', [ EMPTY, 'subject', 'optional' ] ],
	semi: [ ';', [ 'predicate', 'a', 'type' ] ],
	comma: [ ',', [ 'object' ] ],
    optional: [ 'optional', ['block'] ]
};

var labels = {
	ns: 'pre:',
	urip: '<uri>',
	svar: '?var',
	subject: ':subj',
	klass: ':Class',
	predicate: ':prop',
	object: ':obj'
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
		if ((s == EMPTY) && suggestions[1]) { // the close symbol is present, and is usable
			processed.push(suggestions[1]);
		} else { // ok, can we explain what is required?
			var poss = grammar[s][0];
			if (typeof(poss) == 'function') processed.push(labels[s]);
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
		
		var maySkip = false;
		
		for (var i in options) {
	        var option = options[i];
			if (option == EMPTY) {
				maySkip = true;
				continue;
			}
	        var node = grammar[option];
	        if (match(token, node[0])) {
				//println('Matched: ' + token + ' to ' + option);
	            nextNode = node;
	            break;
	        }
	    }
		
		if (!nextNode && !maySkip) {
			//println('Nowhere to go! Options are: ' + options + ' token is ' + token + ' close: ' + closeBit);
			//exit();
			return false; // quietly die
		}
		
		if (closeBit && match(token, closeBit)) return false; // Hmm, what happens if no closeBit, but EMPTY??
		
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
	
	if ((options.length != 0) || closeBit) {
		//println('Exhausted tokens with some work still to do: ' + options + ' ' + closeBit);
		return [options, closeBit];
	}
}

/* Match a token against either a string, object, or function (such as a regex) */
function match(token, object) {
	if (typeof(object) == 'string') return object == token.toLowerCase(); // this is a problem
	if (typeof(object) == 'function') return object(token);
	if (typeof(object) == 'object') return object[token];
	throw 'Not sure how to match against: ' + object;
}

/*
parse('select ?foo ?bar { :a :b :c . }');
println('++++++++++');
parse('select ?foo ?bar where { optional { :a :b :c , :d . } }');
println('++++++++++');
parse('select distinct ?foo ?bar { { :a :b :c ; :e :f . } }');
println('++++++++++');
var suggestions = parse('select * { :a ');
println('Suggested: ' + suggestions);
*/