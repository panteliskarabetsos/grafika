let gl;

window.onload = function () {
  const canvas = document.getElementById('glcanvas'); // Επιλογή του καμβά
  gl = canvas.getContext('webgl'); //ενεργοποίηση WebGL
  if (!gl) {
    alert("WebGL not supported");
    return;
  }

  // Ορισμός του χρώματος φόντου (σκούρο γκρι)
  gl.clearColor(0.0, 0.0, 0.0, 0.4);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Ορισμός κορυφών και χρωμάτων
  const {vertices, colors} = getCubeData();

  // Δημιουργία shader προγράμματος
  const vertexShaderSource = `
  attribute vec3 aPosition;
  attribute vec3 aColor;
  varying vec3 vColor;
  uniform mat4 uProjectionMatrix;
  uniform mat4 uViewMatrix;
  void main(void) {
    gl_Position = uProjectionMatrix * uViewMatrix * vec4(aPosition, 1.0);
    vColor = aColor;
  }
`;


  const fragmentShaderSource = `
    precision mediump float;
    varying vec3 vColor;
    void main(void) {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `;

  const program = createShaderProgram(vertexShaderSource, fragmentShaderSource);
  gl.useProgram(program);

  document.getElementById("redrawBtn").addEventListener("click", () => {
  redrawCamera(program);
});

  // Δημιουργία των πινάκων
  const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, [8, 8, 8], [0, 0, 0], [0, 0, 1]);

  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, glMatrix.toRadian(60), 1.0, 0.001, 8000);

  // Σύνδεση με τους uniforms στον shader
  const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
  const uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
  gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

  // Vertex buffer
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  // Color buffer
  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  const aColor = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aColor);

  // Σχεδίαση
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
};

// Δημιουργία κύβου και χρωμάτων
function getCubeData() {
  const vertices = [];
  const colors = [];

  // Βοηθητική για χρώμα
  function pushFace(v, color) {
    vertices.push(...v);
    for (let i = 0; i < 6; i++) colors.push(...color);
  }

  // Όψεις (6 × 2 τρίγωνα = 12 τρίγωνα = 36 κορυφές)
  pushFace([
    -0.5, -0.5,  0.5, // κάτω αριστερά
     0.5, -0.5,  0.5,   // κάτω δεξιά
     0.5,  0.5,  0.5, // πάνω δεξιά

    -0.5, -0.5,  0.5, // κάτω αριστερά (ξανά)
     0.5,  0.5,  0.5, // πάνω δεξιά
    -0.5,  0.5,  0.5 // πάνω αριστερά

  ], [1.0, 0.0, 0.0]); // Μπροστά – Κόκκινο

  pushFace([
    -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,
    -0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5, -0.5
  ], [0.0, 1.0, 0.0]); // Πίσω – Πράσινο

  pushFace([
    -0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5
  ], [0.0, 0.0, 1.0]); // Πάνω – Μπλε

  pushFace([
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5
  ], [1.0, 1.0, 0.0]); // Κάτω – Κίτρινο

  pushFace([
     0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,
     0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5
  ], [0.0, 1.0, 1.0]); // Δεξιά – Γαλάζιο

  pushFace([
    -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5
  ], [1.0, 0.0, 1.0]); // Αριστερά – Μοβ

  return {vertices, colors};
}

// Shader compiler
function createShaderProgram(vsSource, fsSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return program;
}

function redrawCamera(program) {
  const viewAngleDeg = parseFloat(document.getElementById("viewAngle").value);
  const camOrthoDistance = parseFloat(document.getElementById("camOrthoDistance").value);
  const selectedPosition = document.querySelector("input[name='cameraPos']:checked").value;

  // Υπολογισμός θέσης κάμερας σύμφωνα με το λεκτικό
  const dirs = {
    "Left-Front-Top":    [-1, -1,  1],
    "Left-Front-Bottom": [-1, -1, -1],
    "Left-Back-Top":     [-1,  1,  1],
    "Left-Back-Bottom":  [-1,  1, -1],
    "Right-Front-Top":   [ 1, -1,  1],
    "Right-Front-Bottom":[ 1, -1, -1],
    "Right-Back-Top":    [ 1,  1,  1],
    "Right-Back-Bottom": [ 1,  1, -1]
  };

  const dir = dirs[selectedPosition];
  const cameraPos = [
    dir[0] * camOrthoDistance,
    dir[1] * camOrthoDistance,
    dir[2] * camOrthoDistance
  ];

  // Νέοι πίνακες προβολής
  const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, cameraPos, [0, 0, 0], [0, 0, 1]);

  const projectionMatrix = mat4.create();
  const canvas = document.getElementById("glcanvas");
  const aspect = canvas.width / canvas.height;
  const zFar = camOrthoDistance * 10;
  mat4.perspective(projectionMatrix, glMatrix.toRadian(viewAngleDeg), aspect, 0.001, zFar);

  // Ανανέωση των uniforms
  const uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
  const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
  gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

  // Ανασχεδίαση
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
  console.log("View Angle (deg):", viewAngleDeg);

}
