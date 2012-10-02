var cp = require( "child_process" ),
	spawn = cp.spawn,
	exec = cp.exec;

module.exports = function( _, anvil ) {

	var resolve_path = function(path, dir) {
		var resolved_path;

		if ( path.charAt( 0 ) === "/" ) {
			resolved_path = anvil.project.root + path;
		} else {
			resolved_path = anvil.config[ dir ] + "/" + path;
		}

		return resolved_path;
	};

	return anvil.plugin( {
		name: "anvil.compass",
		activity: "pull",
		dependencies: [ "anvil.workset" ],
		config: {
			"sass_dir": "",
			"css_dir": "",
			"javascripts_dir": "",
			"images_dir": "",
			"generated_images": "",
			"fonts_dir": "",
			"relative_assets": null,
			"output_style": "",
			"line_comments": true,
			"config_file": "",
			"import_path": "",
			"load": "",
			"load_all": ""
		},
		command_args: [ "compile" ],
		commander: [
			[ "-C", "--compass", "run compass compiler"]
		],

		configure: function( config, command, done ) {
			console.log(config);
			// Config file overrides all options
			if ( this.config.config_file ) {
				this.command_args.push( "-c " + this.config.config_file );
			} else {

				if ( this.config.sass_dir ) {
					this.config.sass_dir = resolve_path( this.config.sass_dir, "working" );
					this.command_args.push( "--sass-dir=" + this.config.sass_dir );
				}

				if ( this.config.css_dir ) {
					this.config.css_dir = resolve_path( this.config.css_dir, "output" );
					this.command_args.push( "--css-dir=" + this.config.css_dir );
				}

				if ( this.config.images_dir ) {
					this.config.images_dir = resolve_path( this.config.images_dir, "output" );
					this.command_args.push( "--images-dir=" + this.config.images_dir );
				}

				if ( this.config.javascripts_dir ) {
					this.config.javascripts_dir = resolve_path( this.config.javascripts_dir, "output" );
					this.command_args.push( "--javascripts-dir=" + this.config.javascripts_dir );
				}

				if ( this.config.fonts_dir ) {
					this.config.fonts_dir = resolve_path( this.config.fonts_dir, "output" );
					this.command_args.push( "--fonts-dir=" + this.config.fonts_dir );
				}

				if ( this.config.relative_assets === false ) {
					this.command_args.push( "--relative-assets" );
				}

				if ( this.config.output_style ) {
					this.command_args.push( "--output-style=" + this.config.output_style );
				}

				if ( this.config.line_comments === false) {
					this.command_args.push( "--no-line-comments" );
				}

				if ( this.config.import_path ) {
					this.command_args.push( "-I " + this.config.import_path );
				}

				if ( this.config.load ) {
					this.command_args.push( "--load=" + this.config.load );
				}

				if ( this.config.load_all ) {
					this.command_args.push( "--load-all=" + this.config.load_all );
				}

			}

			done();
		},

		run: function( done, activity ) {
			var self = this,
				sliceLength = self.config.sass_dir.length;
				removeSassFiles = function(file) {
					var ext = file.extension();
					return file.workingPath.slice( 0, sliceLength ) === self.config.sass_dir && ( ext === '.sass' || ext === '.scss' );
				};

			console.log(self.command_args);
			console.log("Original file length: ", anvil.project.files.length);
			anvil.project.files = _.reject( anvil.project.files, removeSassFiles );
			console.log("Filtered file length: ", anvil.project.files.length);

			try {
				
				var compass = spawn( "compass", self.command_args ),
					output = '';

				compass.stdout.on( 'data', function (data) {
					output += data;
					console.log(data.toString());
				});

				
				compass.stderr.on('data', function (data) {
					console.log("Error Received: ", data.toString());
				});
				

				compass.on( "exit", function( code ) {
					console.log(output.toString());
					//anvil.events.raise( "build.stop", "Compass has just run" );
					done();
				});
				
			} catch ( error ) {
				done( "", error );
			}
		}
	} );
};