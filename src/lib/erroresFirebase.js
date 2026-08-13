const MENSAJES = {
  'auth/email-already-in-use': 'Ese correo ya tiene una cuenta creada.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/network-request-failed': 'No hay conexión a internet. Intenta de nuevo.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  'auth/expired-action-code': 'Este enlace ya venció. Pide uno nuevo desde "¿Olvidaste tu contraseña?".',
  'auth/invalid-action-code': 'Este enlace ya se usó o no es válido. Pide uno nuevo desde "¿Olvidaste tu contraseña?".',
  'auth/user-disabled': 'Esta cuenta está desactivada. Habla con tu administrador.',
  'permission-denied': 'No tienes permiso para hacer esto.',
}

export function mensajeErrorAmigable(err) {
  return MENSAJES[err?.code] ?? 'Ocurrió un error inesperado. Intenta de nuevo o avisa al administrador.'
}
