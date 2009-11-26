var sparql = {
    start: [ [ 'prefix', 'select', 'ask' ] ],
    prefix: [ /prefix/, ['ns'] ],
    ns: [ /.*:/, ['urip'] ],
    urip: [ /<.*>/, ['prefix', 'select', 'ask'] ],
    select: [ /select/, ['distinct', 'svar', 'star'] ],
    ask: [ /ask/, ['body'] ],
    distinct: [ /distinct/, ['svar'] ],
    svar: [ /\?.*/, [ 'svar', 'block' ] ],
	star: [ /\*/, [ 'block' ] ],
    block: [ /{/, [ 'body' ], /}/ ],
    body: [ [ 'bgp', 'optional', 'block' ] ],
    bgp: [ /bgp/ ],
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
    var options = grammar['start'][0];
    var token = tokens.shift();
    run(token, tokens, grammar, options);
}

function run(token, tokens, grammar, options, closeBit) {
	if (!token) return; // We're out of tokens
    var nextNode;
    //println('run: ' + token + ' ' + options);
    for (var i = 0; i < options.length; i++) {
        var option = options[i];
        var node = grammar[option];
        if (match(token, node, grammar)) {
			println('Matched: ' + token + ' to ' + option);
            nextNode = node;
            break;
        }
    }
	if (!nextNode) {
		println('Nowhere to go!');
		exit();
	}
	
	var nextToken = tokens.shift();
	
	if (closeBit && nextToken.match(closeBit)) return;
	
	var nextBits;
	if (typeof(nextNode[0]) == 'object') nextBits = nextNode[0];
	else nextBits = nextNode[1];
	var endBit = nextNode[nextNode.length - 1];
	if (typeof(endBit) != 'function') endBit = false;
	//if (endBit) println('Endbit is: ' + endBit);
	run(nextToken, tokens, grammar, nextBits, endBit );
	
	if (closeBit) {
		nextToken = tokens.shift();
		if (nextToken.match(closeBit)) return;
		println('Expecting ' + closeBit + ' but ' + nextToken + ' found');
		exit();
	}
}

function match(token, node, grammar) {
	//println('matching: ' + token + ' against ' + node);
    var matcher = node[0];
	if (typeof(matcher) == 'function') return token.match(matcher);
	for (var i = 0; i < matcher.length; i++) {
		if (match(token, grammar[matcher[i]], grammar)) return true;
	}
	return false;
}

parse('select ?foo ?bar { bgp }');
println('++++++++++');
parse('select ?foo ?bar { optional { bgp } }');
println('++++++++++');
parse('select distinct ?foo ?bar { { bgp } optional { bgp } }');
