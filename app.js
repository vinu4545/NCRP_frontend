document.addEventListener('change', function (event) {
  if (event.target.matches('[data-avatar-upload]')) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var image = document.querySelector('[data-avatar]');
    if (image) image.src = URL.createObjectURL(file);
  }
});
