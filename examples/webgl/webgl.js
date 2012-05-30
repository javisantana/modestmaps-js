
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

    dimensions = dimensions || map.dimensions;
    // create webgl context (from https://developer.mozilla.org/en/WebGL/Getting_started_with_WebGL)
    var canvas = this.canvas = document.createElement('canvas');
    canvas.width = dimensions.x;
    canvas.height = dimensions.y;
    canvas.style.padding = '0';
    canvas.style.margin= '0';
    canvas.style.position = 'absolute'; //show on top of other layers


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
          "precision highp float;"+
          "attribute vec2 pos;"+
          "uniform vec3 camPos;" +
          "void main() {"+
          " gl_PointSize = 10.0; "+
          " gl_Position = vec4(pos, 0.0, 2.0);"+
          "}",
          "precision highp float;"+
          "void main() {"+
          " vec2 p = gl_PointCoord + vec2(-.5, -.5);" +
          " float d = sqrt(p.x*p.x+p.y*p.y);"+
          " gl_FragColor = vec4(0, 0, 0, step(0.6,  1.0 - d));"+
          "}"
        );
        this.program = prog;
        gl.useProgram(prog);
        this.vertexBuffer = createVertexBuffer(gl, 2, [
          -1, -1,
          -1, 1,
          1, -1,
          1, 1,
        ]);
        setBufferData(gl, prog, "pos", this.vertexBuffer);
        var err = gl.errorValue
        if(err != 0) {
          console.log(err);
        }
    },

    draw: function(map) {
        var gl = this.gl;
        gl.clearColor(0.0, 0.0, 0.0, 0.2);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  
        gl.drawArrays(gl.POINTS, 0, 4);

        this.program.uColor = gl.getUniformLocation(this.program, "markerPos");
        gl.uniform3fv(this.program.uColor, [1.0, 0.0, 0.0]);
        var err = gl.errorValue
        if(err != 0) {
          console.log(err);
        }
    }
};
