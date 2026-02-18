export class DemoQaLocators {
  // Home / navigation
  readonly cardElements = '.category-cards .card:has-text("Elements")';
  readonly menuTextBox = 'text=Text Box';
  readonly menuForms = '.category-cards .card:has-text("Forms")';
  readonly menuPracticeForm = 'text=Practice Form';

  // Text Box form
  readonly inputFullName = 'input[placeholder="Full Name"]';
  readonly inputEmailTextBox = 'input[placeholder="name@example.com"]';
  readonly inputCurrentAddressTextBox = 'textarea[placeholder="Current Address"]';
  readonly inputPermanentAddress = '#permanentAddress';
  readonly btnSubmitTextBox = 'button:has-text("Submit")';

  // Practice Form
  readonly inputFirstName = 'input[placeholder="First Name"]';
  readonly inputLastName = 'input[placeholder="Last Name"]';
  readonly inputEmailPractice = 'input[placeholder="name@example.com"]';
  readonly radioMaleLabel = 'label[for="gender-radio-1"]';
  readonly inputMobile = 'input[placeholder="Mobile Number"]';
  readonly inputDateOfBirth = '#dateOfBirthInput';
  readonly selectYear = '.react-datepicker__year-select';
  readonly day2010Dec1 = 'div.react-datepicker__day--001.react-datepicker__day--wed';
  readonly inputSubjects = '#subjectsInput';
  readonly checkboxSportsLabel = 'label[for="hobbies-checkbox-1"]';
  readonly inputCurrentAddressPractice = 'textarea[placeholder="Current Address"]';
  readonly dropdownState = '#state';
  readonly optionStateUttarPradesh = 'div[id^="react-select-3-option"]:has-text("Uttar Pradesh")';
  readonly dropdownCity = '#city';
  readonly optionCityLucknow = 'div[id^="react-select-4-option"]:has-text("Lucknow")';
  readonly btnSubmitPractice = 'button:has-text("Submit")';

  // Modal
  readonly modalTitle = '#example-modal-sizes-title-lg';
  readonly btnCloseModal = 'button:has-text("Close")';
}
