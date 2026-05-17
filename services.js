document.querySelectorAll(".rating").forEach(function(ratingBox) {
    const stars = ratingBox.querySelectorAll("span");

    stars.forEach(function(star, index) {
        star.addEventListener("click", function() {
            stars.forEach(function(s) {
                s.classList.remove("active");
            });

            for (let i = 0; i <= index; i++) {
                stars[i].classList.add("active");
            }
        });
    });
});