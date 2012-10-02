var should = require( "should" );
var api = require( "anvil.js" );
var Harness = api.PluginHarness;

var harness = new Harness( "anvil.compass", "./" ),
		tests = [];



describe( "when using compass", function() {

	before( function( done ) {
		harness.build(
			function( x, y ) {
				y.should.equal( x );
			},
			function( results ) {
				tests = results;
				done();
			}
		);
	} );

	it( "should produce expected output", function() {
		_.each( tests, function( test ) {
			test.call();
		} );
	} );

} );