/*
	anvil.compass - Compass plugin for anvil.js
	version: 0.0.1
	author: [object Object]
	copyright: 2012
	license: Dual licensed 
			 MIT (http://www.opensource.org/licenses/mit-license)
			 GPL (http://www.opensource.org/licenses/gpl-license)
*/
var cp = require( "child_process" ),
	spawn = cp.spawn,
	exec = cp.exec;

module.exports = function( _, anvil ) {
	return anvil.plugin( {
		name: "anvil.haml",
		config: {
			"options": {}
		},

		configure: function( config, command, done ) {
			anvil.addCompiler( ".haml", this );
			child = exec('which haml',
				function (error, stdout, stderr) {
					if ( error !== null || !stdout ) {
						anvil.log.error( "HAML Ruby Gem not found");
						throw "HAML Ruby Gem not found";
					}
					done();
				}
			);
		},

		compile: function( content, done ) {
			try {

				var compile = spawn( "haml", [ "--stdin" ]),
					haml = '';

				compile.stdout.on( 'data', function (data) {
					haml += data;
				});

				/*
				Should we figure out a graceful way to handle stderr output?
				Halts compiler if anything is thrown here
				compile.stderr.on('data', function (data) {
					console.log("Error Received");
					console.log(data);
					done( "", data);
				});
				*/

				compile.on( "exit", function( code ) {
					done( haml );
				});

				compile.stdin.write( content );
				compile.stdin.end();

			} catch ( error ) {
				done( "", error );
			}
		},

		rename: function( name ) {
			return name.replace( ".haml", ".html" );
		}
	} );
};