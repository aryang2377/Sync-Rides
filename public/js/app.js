// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });

  const roleSelect = document.querySelector('select[name="role"]');
  const driverFields = document.getElementById("driver-fields");
  const vehicleInput = document.querySelector('input[name="vehicle_model"]');
  const seatsInput = document.querySelector('input[name="seats"]');

  if (roleSelect && driverFields && vehicleInput && seatsInput) {
    const updateDriverFields = () => {
      if (roleSelect.value === "driver") {
        driverFields.classList.remove("d-none");
        vehicleInput.required = true;
        seatsInput.required = true;
      } else {
        driverFields.classList.add("d-none");
        vehicleInput.required = false;
        seatsInput.required = false;
        vehicleInput.value = "";
        seatsInput.value = "";
      }
    };

    roleSelect.addEventListener("change", updateDriverFields);
    updateDriverFields();
  }
})();
