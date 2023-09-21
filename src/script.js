/**
 * Form Submit - v0.2
 * URL: https://github.com/arhitov/javascript-submit-form
 * Author: Alexander Arhitov clgsru@gmail.com
 */
(function () {
    "use strict";

    // form.submit-form
    //      [data-reset_form="false"]
    // .submit-form-message-error
    // .submit-form-message-success
    // .submit-form-button-submit
    // .submit-form-loading

    function toggle (parentNode, selector) {
        const element = (selector instanceof Element)
            ? selector
            : parentNode.querySelector(selector);
        return {
            show: element
                ? function (str = null) {
                    element.classList.remove('d-none');
                    if (str) {
                        element.innerHTML = str;
                    }
                }
                : (str) => null,
            hide: element
                ? function () {
                    element.classList.add('d-none');
                }
                : () => null,
        };
    }

    function initForm (selfForm) {
        let thisForm = selfForm;
        let dataForm= new FormData( thisForm );
        const loading= toggle(thisForm, '.submit-form-loading');
        const message_error = toggle(thisForm, '.submit-form-message-error');
        const message_success= toggle(thisForm, '.submit-form-message-success');
        const button_submit = (function () {
            const element = thisForm.querySelector('.submit-form-button-submit');
            return {
                lock: element
                    ? function () {
                        element.setAttribute('disabled', 'disabled');
                    }
                    : (str) => null,
                unlock: element
                    ? function () {
                        element.removeAttribute('disabled');
                    }
                    : () => null,
            };
        })();
        const displayLoading = function () {
            button_submit.lock();
            loading.show();
            message_error.hide();
            message_success.hide();
        };
        const displaySuccess = function (success = '') {
            button_submit.unlock();
            loading.hide();
            message_success.show(success);

            if ('' === (thisForm.getAttribute('data-reset_form') ?? '')) {
                thisForm.reset();
            }
        };
        const displayError = function (error) {
            button_submit.unlock();
            loading.hide();
            message_error.show(error);
        };

        return {
            form: thisForm,
            data: dataForm,
            displayLoading: displayLoading,
            displaySuccess: displaySuccess,
            displayError: displayError,
            submit: function () {
                let action = thisForm.getAttribute('action');
                fetch(action, {
                    method: 'POST',
                    body: dataForm,
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                    .then(async response => {
                        try {
                            return {
                                response: response,
                                answer: await response.json()
                            };
                        } catch (e) {
                            console.error(e);
                            throw new Error(`${response.status} ${response.statusText} ${response.url}`);
                        }
                    })
                    .then(data => {
                        if (data.response.ok) {
                            return {
                                status: data.response.status,
                                answer: data.answer
                            };
                        } else {
                            if (data.answer.errors) {
                                for (const [key, value] of Object.entries(data.answer.errors)) {
                                    const input = thisForm.querySelector('input[name=' + key + ']');
                                    if (input) {
                                        input.classList.add('is-invalid');
                                        const feedback = input.parentElement.querySelector('.invalid-feedback');
                                        if (feedback) {
                                            feedback.innerText = value;
                                        }
                                    }
                                }
                            }
                            if (data.answer.message) {
                                throw new Error(`${data.answer.message}`);
                            } else {
                                throw new Error(`${data.response.status} ${data.response.statusText} ${data.response.url}`);
                            }
                        }
                    })
                    .then(data => {
                        if (data.answer.message) {
                            displaySuccess(data.answer.message);
                            return data.answer;
                        } else if (201 === data.status) {
                            displaySuccess('Successful');
                            return data.answer;
                        } else if (202 === data.status) {
                            displaySuccess('Successful');
                            return data.answer;
                        } else {
                            throw new Error(data ? data : 'Form submission failed and no error message returned from: ' + action);
                        }
                    })
                    .then(answer => {
                        if (answer.redirect_to) {
                            sleep(2000).then(() => {
                                window.location.href = answer.redirect_to;
                            });
                        }

                        const event = thisForm.getAttribute('data-event-success');
                        if (event) {
                            document.dispatchEvent(new CustomEvent('submit-form.' + event, {
                                detail: {
                                    form: thisForm,
                                    data: dataForm,
                                    answer: answer
                                }
                            }));
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                        displayError(error);
                    });
            }
        };
    }

    ([].slice.call(document.querySelectorAll('form.submit-form'))).forEach(element => {
        element.addEventListener('submit', event => {
            event.preventDefault();

            const form = initForm(element);
            let action = form.form.getAttribute('action');
            let recaptcha = form.form.getAttribute('data-recaptcha-site-key');

            if( ! action ) {
                form.displayError('The form action property is not set!');
                return;
            }

            form.displayLoading();

            if ( recaptcha ) {
                if(typeof grecaptcha !== "undefined" ) {
                    grecaptcha.ready(function() {
                        try {
                            grecaptcha.execute(recaptcha, {action: 'submit'})
                                .then(token => {
                                    form.data.set('recaptcha-response', token);
                                    form.submit();
                                })
                        } catch(error) {
                            form.displayError(error);
                        }
                    });
                } else {
                    form.displayError('The reCaptcha javascript API url is not loaded!')
                }
            } else {
                form.submit();
            }
        });
    });

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

})();
