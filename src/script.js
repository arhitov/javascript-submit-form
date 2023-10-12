/**
 * Form Submit - v1.0
 * URL: https://github.com/arhitov/javascript-submit-form
 * Author: Alexander Arhitov clgsru@gmail.com
 */
(function () {
    "use strict";

    // form.submit-form
    //     [data-reset_form="false"]    Do not reset the form after successful completion
    //     [data-event-success="name"]  Execute the "submit-form.{name}" event on the document object

    const BLOCK_LOADING_SELECTOR = '.submit-form-loading';
    const BLOCK_SUCCESS_SELECTOR = '.submit-form-message-success';
    const BLOCK_ERROR_SELECTOR = '.submit-form-message-error';
    const BUTTON_SUBMIT_SELECTOR = '.submit-form-button-submit';

    window.submitFormList = {};

    const toggle = (parentNode, selector) => {
        const element = (selector instanceof Element)
            ? selector
            : parentNode.querySelector(selector);
        return {
            show(str = null) {
                if (! element) {
                    return;
                }
                element.classList.remove('d-none');
                if (str) {
                    element.innerHTML = str;
                }
            },
            hide() {
                element?.classList.add('d-none');
            },
        };
    };

    const callbackList = () => {
        let list = [];
        return {
            /**
             * Adding a callback function
             * @param {function} callback
             * @return {number}
             */
            push(callback) {
                return list.push(callback);
            },
            /**
             * Execute all added callback functions
             */
            run() {
                list.forEach(callback => {
                    callback.apply(null, arguments);
                });
            },
        }
    };

    function getFormInterface (form) {
        const callbackListSuccess = callbackList();
        const callbackListError = callbackList();
        let answerSuccessful = null;

        const eventName = form.getAttribute('data-event-success');
        if (eventName) {
            callbackListSuccess.push(() => {
                callEvent('submit-form.' + eventName, {
                    form: form,
                    data: formData(),
                    answer: answerSuccessful
                });
            });
        }


        /**
         * Form name
         * @return {string}
         */
        const formName = () => {
            return form.getAttribute('name');
        };

        /**
         * Form data in FormData format
         * @return {FormData}
         */
        const formData = () => {
            return new FormData(form);
        }

        /**
         * Submitting a form
         * @return {void}
         */
        const formSubmit = () => {
            form.requestSubmit()
        }

        const uiEvent = (() => {
            const loading= toggle(form, BLOCK_LOADING_SELECTOR);
            const success= toggle(form, BLOCK_SUCCESS_SELECTOR);
            const error = toggle(form, BLOCK_ERROR_SELECTOR);
            const buttonSubmit = (() => {
                const element = select(BUTTON_SUBMIT_SELECTOR, form);
                return {
                    lock() {
                        element?.setAttribute('disabled', 'disabled');
                    },
                    unlock() {
                        element?.removeAttribute('disabled');
                    },
                };
            })();

            const methods = {
                clear() {
                    loading.hide();
                    success.hide();
                    error.hide();
                    buttonSubmit.unlock();
                    return methods;
                },
                loading() {
                    loading.show();
                    success.hide();
                    error.hide();
                    buttonSubmit.lock();
                    return methods;
                },
                success(str) {
                    loading.hide();
                    success.show(str);

                    if ('' === (form.getAttribute('data-reset_form') ?? '')) {
                        form.reset();
                    }
                    return methods;
                },
                error(str) {
                    loading.hide();
                    error.show(str);
                    return methods;
                },
            };

            return methods;
        })();

        const uiFiled = (() => {
            const clear = input => {
                input.classList.remove('is-invalid');
                const feedback = input.parentElement.querySelector('.invalid-feedback');
                if (feedback) {
                    feedback.innerText = '';
                }
            };

            return {
                clear() {
                    selectAllForEach('.is-invalid', element => {
                        clear(element);
                    });
                },
                error(errors) {
                    for (const [key, value] of Object.entries(errors)) {
                        const input = select('input[name=' + key + ']', form);
                        if (input) {
                            input.classList.add('is-invalid');
                            const feedback = input.parentElement.querySelector('.invalid-feedback');
                            if (feedback) {
                                feedback.innerText = value;
                            }
                            input.addEventListener('input', () => {
                                clear(input);
                            }, {once: true});
                        }
                    }
                },
            };
        })();

        const fetchSubmit = () => {
            answerSuccessful = null;
            let action = form.getAttribute('action');
            uiFiled.clear();
            fetch(action, {
                method: 'POST',
                body: formData(),
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
                    if (data.answer.message) {
                        throw new Error(`${data.answer.message}`);
                    } else {
                        throw new Error(`${data.response.status} ${data.response.statusText} ${data.response.url}`);
                    }
                }
            })
            .then(data => {
                if (data.answer.errors) {
                    uiFiled.error(data.answer.errors);
                }
                if (data.answer.message) {
                    uiEvent.clear().success(data.answer.message);
                    return data.answer;
                } else if (201 === data.status) {
                    uiEvent.clear().success('Successful');
                    return data.answer;
                } else if (202 === data.status) {
                    uiEvent.clear().success('Successful');
                    return data.answer;
                } else {
                    throw new Error(data ? data : 'Form submission failed and no error message returned from: ' + action);
                }
            })
            /**
             * @param {{redirect_to:string}} answer
             */
            .then(answer => {
                if (answer.redirect_to) {
                    sleep(2000).then(() => {
                        window.location.href = answer.redirect_to;
                    });
                }
                answerSuccessful = answer;
                callbackListSuccess.run(answer);
            })
            .catch((error) => {
                console.error(error);
                uiEvent.clear().error(error);

                callbackListError.run(error);
            });
        };

        listenerEvent('submit', (data, event) => {
            event.preventDefault();

            let action = form.getAttribute('action');
            let recaptcha = form.getAttribute('data-recaptcha-site-key');

            if( ! action ) {
                uiEvent.clear().error('The form action property is not set!');
                return;
            }

            uiEvent.loading();

            if ( recaptcha ) {
                if(typeof grecaptcha !== 'undefined' ) {
                    grecaptcha.ready(function() {
                        try {
                            grecaptcha.execute(recaptcha, {action: 'submit'})
                                .then(token => {
                                    formData().set('recaptcha-response', token);
                                    fetchSubmit();
                                })
                        } catch(error) {
                            uiEvent.clear().error(error);
                        }
                    });
                } else {
                    uiEvent.clear().error('The reCaptcha javascript API url is not loaded!')
                }
            } else {
                fetchSubmit();
            }

        }, form);

        function FormInterface() {

            /**
             * Form instance
             * @return {Element}
             */
            this.form = () => {
                return form;
            };

            /**
             * @see formName
             */
            this.name = formName;

            /**
             * @see formData
             */
            this.data = formData;

            /**
             * @see formSubmit
             */
            this.submit = formSubmit;

            /**
             * @see uiEvent.success
             */
            this.displaySuccess = uiEvent.success;

            /**
             * @see uiEvent.error
             */
            this.displayError = uiEvent.error;

            /**
             * Subscription successful response
             * @param {function} callback
             * @return {number}
             */
            this.callbackSuccess = callback => {
                return callbackListSuccess.push(callback);
            };

            /**
             * Subscription failed response
             * @param {function} callback
             * @return {number}
             */
            this.callbackError = callback => {
                return callbackListError.push(callback);
            };

            /**
             * Hides form lines that have a data-field attribute
             */
            this.fieldHide = () => {
                selectAllForEach('[data-field]', element => {
                    element.classList.add('d-none');
                }, form);
            };

            /**
             * Subscribe by clicking on an element to submit the form
             * @param {Element} element
             */
            this.listenerClickForSubmit = element => {
                listenerEvent('click', () => {
                    form.requestSubmit();
                }, element);
            };
        }

        return new FormInterface();
    }

    window.submitForm = {
        /**
         * Starting observe for form
         * @param {Element} form
         * @return {FormInterface}
         */
        observe(form) {
            const formInterface = getFormInterface(form);

            if (formInterface.name()) {
                window.submitFormList[formInterface.name()] = formInterface;
            }
            return formInterface;
        },
    };

    selectAllForEach('form.submit-form', form => {
        window.submitForm.observe(form);
    });

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

})();
