var EMPTY = new Object();

var sparql = {
    start: [ /fake/, [ 'prefix', 'select', 'ask' ] ],
    prefix: [ /prefix/, ['ns'] ],
    ns: [ /.*:/, ['urip'] ],
    urip: [ /<.*>/, ['prefix', 'select', 'ask'] ],
    select: [ /select/, ['distinct', 'svar', 'star'] ],
    ask: [ /ask/, ['body'] ],
    distinct: [ /distinct/, ['svar'] ],
    svar: [ /\?.*/, [ 'svar', 'body', 'where' ] ],
	star: [ /\*/, [ 'where', 'body' ] ],
	where: [ /where/, [ 'body' ] ],
	body: [ /{/, [ EMPTY, 'subject', 'optional', 'block' ], /}/, [] ],
    block: [ /{/, [ EMPTY, 'subject', 'optional', 'block' ], /}/, [ EMPTY ] ],
	subject: [ /:.*/, [ 'predicate' ] ],
	predicate: [ /:.*/, [ 'object' ]],
	object: [ /:.*/, [ 'comma', 'semi', 'stop' ] ],
	stop: [ /\./, [ EMPTY, 'subject', 'optional' ] ],
	semi: [ /;/, [ 'predicate' ] ],
	comma: [ /,/, [ 'object' ] ],
    optional: [ /optional/, ['block'] ]
};

function parse(test) {
    var tokens = tokenise(test);
    var suggestions = suggest(tokens, sparql);
}

function tokenise(string) {
    return string.split(/\s+/);
}

function suggest(tokens, grammar) {
    var options = grammar['start'][1];
    var token = tokens.shift();
    run(token, tokens, grammar, options);
}

function run(token, tokens, grammar, options, closeBit) {
	
	while (token) {
		
		//println('Token is: ' + token + ' Options are: ' + options);
				
		var nextNode = false;
		
		// Needs fixing. Dead end might have closeBit.
		if (options.length == 0) {
			println('Grammar dead end, but have stray token: ' + token);
		}
		
		var maySkip = false;
		
		for (var i = 0; i < options.length; i++) {
	        var option = options[i];
			if (option == EMPTY) {
				maySkip = true;
				continue;
			}
	        var node = grammar[option];
	        if (match(token, node)) {
				println('Matched: ' + token + ' to ' + option);
	            nextNode = node;
	            break;
	        }
	    }
		
		if (!nextNode && !maySkip) {
			println('Nowhere to go! Options are: ' + options + ' token is ' + token + ' close: ' + closeBit);
			exit();
		}
		
		if (closeBit && token.match(closeBit)) return; // Hmm, what happens if no closeBit, but EMPTY??
		
		token = tokens.shift();

		options = nextNode[1];
		var endBit = nextNode[2];
		//if (endBit) println('Endbit is: ' + endBit);
		if (endBit) {
			run(token, tokens, grammar, options, endBit );
			options = nextNode[3];
			token = tokens.shift();
		}		
	}
	
	if ((options.length != 0) || closeBit) {
		println('Exhausted tokens with some work still to do: ' + options + ' ' + closeBit);
	}
}

function match(token, node) {
	return token.match(node[0]);
}

parse('select ?foo ?bar { :a :b :c . }');
println('++++++++++');
parse('select ?foo ?bar where { optional { :a :b :c , :d . } }');
println('++++++++++');
parse('select distinct ?foo ?bar { { :a :b :c ; :e :f . } }');
