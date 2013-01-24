/*
	anvil.compass - Compass plugin for anvil.js
	version: 0.0.2
	author: [object Object]
	copyright: 2012
	license: Dual licensed 
			 MIT (http://www.opensource.org/licenses/mit-license)
			 GPL (http://www.opensource.org/licenses/gpl-license)
*/
var cp = require( "child_process" ),
	spawn = cp.spawn,
	exec = cp.exec,
	path = require( "path" ),
	nodefs = require( "fs" ),
	os = require('os');

module.exports = function( _, anvil ) {

	var startsWith = function( orig, compare ) {
		return orig.slice( 0, compare.length ) === compare;
	},

	resolve_path = function( filepath ) {
		// Check for path substitutions
		if ( filepath.indexOf( "{{SOURCE}}" ) !== -1 ) {
			filepath = filepath.replace( "{{SOURCE}}", anvil.config.working );
		} else if ( filepath.indexOf( "{{OUTPUT}}" ) !== -1 ) {
			filepath = filepath.replace( "{{OUTPUT}}", anvil.config.output );
		}

		// Resolve full path for comparison purposes
		filepath = path.resolve( filepath );

		// If path starts with the source directory, substitute in the working path
		if ( startsWith( filepath, anvil.config.source ) ) {
			filepath = filepath.replace( anvil.config.source, anvil.config.working );
		}

		// Convert path to relative paths for the Compass config file.
		filepath = path.relative( anvil.project.root, filepath );
		return filepath;
	},

	rubify = function( value ) {
		// Test for true, false, nil, and symbols
		if ( /^(true|false|nil)$/i.test( value ) || /^:/.test( value ) ) {
			return value;
		} else {
			// Encase in quotes
			var vals = value.split( "\\" );
			if ( vals.length ) {
				value = vals.join( "/" );
			}
			return '"' + value + '"';
		}
	};

	return anvil.plugin( {
		name: "anvil.compass",
		activity: "pull",
		dependencies: [ "anvil.workset" ],
		// All possible Compass configuration options
		config: {
			"project_type": null,
			"environment": null,
			"project_path": null,
			"http_path": null,
			"css_dir": null,
			"css_path": null,
			"http_stylesheets_path": null,
			"sass_dir": null,
			"sass_path": null,
			"images_dir": null,
			"images_path": null,
			"http_images_path": null,
			"generated_images_dir": null,
			"generated_images_path": null,
			"http_generated_images_path": null,
			"javascripts_dir": null,
			"javascripts_path": null,
			"http_javascripts_path": null,
			"output_style": null,
			"relative_assets": null,
			"additional_import_paths": null,
			"disable_warnings": null,
			"sass_options": null,
			"line_comments": null,
			"preferred_syntax": null,
			"fonts_dir": null,
			"fonts_path": null,
			"http_fonts_path": null,
			"http_fonts_dir": null,
			"sprite_engine": null,
			"sprite_load_path": null
		},
		// Configuration keys that should not be written to compass.config.rb
		config_exclude_keys: [
			"config_file"
		],
		// The files from these directories will be excluded from anvil processing
		// @TODO: Look at excluding by file extension
		file_exclude_dirs: [
			{ "folder": "sass_dir", "pattern": "\\.(sass|scss)$"}
		],
		cfg_file: anvil.config.working + "/compass.config.rb",
		command: os.type() === 'Windows_NT' ? "compass.bat" : "compass",
		command_args: [],
		output: [],

		configure: function( config, command, done ) {
			var self = this;

			if( anvil.config[ "anvil.identify" ].continuous ) {
				this.continuous = true;
				this.command_args = [ "watch", "." ];
			} else {
				this.command_args = [ "compile", "." ];
			}

			if ( this.config.config_file ) {
				// Read in configuration from file and create new file
				anvil.fs.read( this.config.config_file, function( content, err ) {
					if ( err ) {
						anvil.events.raise( "build.stop", "Error reading Compass configuration file: ", err );
						done();
					} else {
						self.parseConfig( content, function() {
							self.writeConfigFile( content, true, done );
						} );
					}
				} );

			} else {
				this.writeConfigFile( "", false, done );
			}

		},

		parseConfig: function( content, callback ) {
			// At this point we have the contents of a Ruby configuration file
			var lines,
				cfg_obj = {};


			// Split file on line endings.
			// @TODO: Test on Windows files
			lines = content.split( /\n/ );

			// Process lines into a JS configuration object
			_.each(lines, function( line ) {
				line = line.trim();
				// Filter out empty lines and comments
				if ( ! line || /^#/.test( line ) ) {
					return false;
				}

				// Split variable assignments and extract strings
				var split = line.split( /\s*=\s*/ ),
					key = split[0],
					val = split[1];
					string_matches = val.match( /["|'](.*)["|']/ );

				if ( string_matches ) {
					val = string_matches[1];
				}

				// Remove trailing comments
				var comment_index = val.indexOf( "#" );
				if ( comment_index !== -1 ) {
					val = val.slice( 0, comment_index );
				}

				val = val.trim();

				if ( val ) {
					cfg_obj[ key ] = val;
				}

			});

			// Merge new object into plugin configuration
			if ( ! _.isEmpty( cfg_obj ) ) {
				this.config = _.extend( this.config, cfg_obj );
			}

			callback();
		},

		writeConfigFile: function( prepended_content, resolved_paths_only, callback ) {
			prepended_content = prepended_content || "";
			resolved_paths_only = resolved_paths_only || false;

			var self = this,
				cfg_lines = [],
				cfg_contents = '',
				// Configuration paths that need to be resolved
				to_resolve = [
					"sass_dir",
					"css_dir",
					"images_dir",
					"javascripts_dir",
					"fonts_dir",
					"generated_images_dir",
					"http_fonts_dir"
				],
				copyToFile = function(val, key) {
					var copy = false;
					if ( ! _.isNull( val ) && ! _.contains( self.config_exclude_keys, key ) ) {
						if ( resolved_paths_only ) {
							copy = _.contains( to_resolve, key );
						} else {
							copy = true;
						}
					}
					return copy;
				};

			if ( prepended_content ) {
				cfg_lines.push( prepended_content );
			}

			// Prepare config object for writing to Ruby file
			_.each( self.config, function(val, key, list) {
				if ( copyToFile( val, key ) ) {
					self.config[key] = _.contains( to_resolve, key ) ? resolve_path( val ) : val;
					cfg_lines.push(key + " = " + rubify( self.config[key] ) );
				}
			});

			// Join file lines array into a string for writing to file
			config_contents = cfg_lines.join("\r\n");
			this.command_args.push( "--config=" + this.cfg_file );

			// Figure out which directories we need to make anvil ignore
			this.file_exclude_dirs = _.chain( this.file_exclude_dirs )
				.reject( function( dir ) {
					return _.isNull( self.config[ dir.folder ] );
				} )
				.map( function( dir ) {
					dir.folder = path.resolve( self.config[ dir.folder ] );
					return dir;
				})
				.value();

			// Writing Compass configuration to file
			anvil.fs.write( this.cfg_file, config_contents, function( err ) {
				if ( err ) {
					// Break build, couldn't create configuration file
					anvil.raise( "log.error", err );
					anvil.raise( "build.stop", "Error creating Compass configuration file" );
				}

				callback();
			});
		},

		run: function( done, activity ) {
			var self = this,
				inExcludedDir = function( file ) {
					// Reject if the file path is within the excluded directories
					var reject = false;
					_.each( self.file_exclude_dirs, function( dir ) {
						if ( startsWith( file.workingPath, dir.folder ) ) {
							var regex = new RegExp(dir.pattern);
							if( regex.test( file.name ) ) {
								file.noCopy = true;
							}
						}
					});
				},
				onData = this.continuous ? this.onWatchData : this.onCompileData,
				onExit = this.continuous ? this.onWatchExit : this.onCompileExit;

			_.each( anvil.project.files, inExcludedDir );
			if( this.continuous && this.compass ) {
				done();
				return;
			}

			try {
				// Execute Compass process
				var compass = this.compass = spawn( this.command, self.command_args );
				compass.stdout.on( "data", onData );
				compass.stderr.on( "data", this.onError );
				compass.on( "exit", onExit );
				this.runComplete = done;
				
			} catch ( error ) {
				done( "", error );
			}
		},

		onCompileData: function( data ) {
			this.output += data;
		},

		onError: function( data ) {
			anvil.log.error( data.toString() );
		},

		onWatchData: function( data ) {
			anvil.log.event( "Compass: " + data );
			if( this.runComplete ) {
				this.runComplete();
				this.runComplete = undefined;
			}
		},

		onCompileExit: function( code ) {
			var self = this;
			self.compass = undefined;
			anvil.log.event( "Compass Output" );
			anvil.log.event( "----------------------" );
			var lines = this.output.toString().split( /\n/ );
			if ( lines ) {
				_.each(lines, function( line ) {
					if( !_.isEmpty( line ) ) {
						anvil.log.event( line.trim() );
					}
				});
			}
			anvil.log.event( "----------------------" );
			anvil.log.event( "Compass Compiling Complete" );
			this.output = "";
			this.runComplete();
		},

		onWatchExit: function( code ) {
			var self = this;
			self.compass = undefined;
		}
	} );
};
