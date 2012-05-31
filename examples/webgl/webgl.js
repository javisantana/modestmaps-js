
function glGetError(gl) {
        var ctx, error;
        ctx = gl.getCurrentContext();
        error = ctx.errorValue;
        ctx.errorValue = GL_NO_ERROR;
        return error;
}

// webgl utils
function shaderProgram(gl, vs, fs) {
  var prog = gl.createProgram();
  var addshader = function(type, source) {
    var s = gl.createShader((type == 'vertex') ?
      gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw "Could not compile "+type+
        " shader:\n\n"+gl.getShaderInfoLog(s);
    }
    gl.attachShader(prog, s);
  };
  addshader('vertex', vs);
  addshader('fragment', fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw "Could not link the shader program!";
  }
  return prog;
}

function createVertexBuffer(gl, rsize, arr) {
  var buff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
  buff.vSize = rsize;
  return buff;
}

function setBufferData(gl, prog, attr_name, buff) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buff);
  var attr = gl.getAttribLocation(prog, attr_name);
  gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr, buff.vSize, gl.FLOAT, false, 0, 0);
}

MM.WebGL = function(map, dimensions) {
    var self = this;
    this.map = map;

    dimensions = dimensions || map.dimensions;
    // create webgl context (from https://developer.mozilla.org/en/WebGL/Getting_started_with_WebGL)
    var canvas = this.canvas = document.createElement('canvas');
    canvas.width = dimensions.x;
    canvas.height = dimensions.y;
    canvas.style.padding = '0';
    canvas.style.margin= '0';
    canvas.style.position = 'absolute'; //show on top of other layers



    var loc = new MM.Location(47.6, -4.3);
    this.coord = map.locationCoordinate(loc); 

    try {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    }
    catch(e) {}

    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }

    this.gl = gl;

    this.init();
    var callback = function(m, a) { return self.draw(m); };
    map.addCallback('drawn', callback);
    map.parent.appendChild(this.canvas);
    this.draw(map);
};

MM.WebGL.prototype = {

    init: function() {
        var gl = this.gl;
        var prog = shaderProgram(gl,
          "precision highp float;\n"+
          "#define pi 3.141592653589793238462643383279 \n" +
          "#define tileSize 256.0 \n" +
          "uniform vec2 mapSize;" +
          "uniform float zoom;" +
          "uniform vec2 mapPos;" +
          "attribute vec2 pos;"+
          "vec2 latlon2coord(vec2 latlon) {" +
          " latlon = latlon*pi/180.0;"+
          " vec2 mercator = vec2(latlon.y*0.5/pi, log(tan(0.25 * pi + 0.5*latlon.x))*0.5/pi);"+
          " return mercator*pow(2.0, zoom)*tileSize;" + 
          "}" + 
          "void main() {"+
          " gl_PointSize = zoom; "+
          " vec2 coord = latlon2coord(pos);" +
          " vec2 mapCoord = latlon2coord(mapPos);" +
          " vec2 p = coord - mapCoord; " +
          " gl_Position = vec4(p/mapSize, 0.0, 1.0);"+
          "}",
          "precision highp float;"+
          "void main() {"+
          " vec2 p = gl_PointCoord + vec2(-.5, -.5);" +
          " float d = sqrt(p.x*p.x+p.y*p.y);"+
          " gl_FragColor = vec4(0, 0, 0, step(0.7,  1.0 - d));"+
          "}"
        );
        this.program = prog;
        gl.useProgram(prog);
        var points = [];
        for(var i = 0; i < 65000; ++i) {
            points.push(10*2*(Math.random() - 0.5));
            points.push(10*2*(Math.random() - 0.5));
        }
        this.vertexBuffer = createVertexBuffer(gl, 2, points);
        setBufferData(gl, prog, "pos", this.vertexBuffer);
        var err = gl.errorValue;
        if(err != 0) {
          console.log(err);
        }
    },
    draw: function(map) {
        var gl = this.gl;
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        /*var total = 100000;
        var n = (total/65000)>>0;
        for(var i = 0; i < n;  ++i) {
            console.log(i);
            gl.drawArrays(gl.POINTS, i*n, 65000);
        }*/

        var mapSize = gl.getUniformLocation(this.program, "mapSize");
        gl.uniform2fv(mapSize, [this.canvas.width, this.canvas.height]);
        var zoom = gl.getUniformLocation(this.program, "zoom");
        gl.uniform1f(zoom, this.map.getZoom()+1);
        var mapPos = gl.getUniformLocation(this.program, "mapPos");
        var c =  this.map.getCenter();
        gl.uniform2fv(mapPos, [c.lat, c.lon]);

        gl.drawArrays(gl.POINTS, 0, 65000);

        var err = gl.errorValue;
        if(err != 0) {
          console.log(err);
        }
    }
};
