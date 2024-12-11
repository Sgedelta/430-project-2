/* Takes in an error message. Sets the error message up in html, and
   displays it to the user. Will be hidden by other events that could
   end in an error.
*/
const handleError = (message) => {
    let printedText; 
    if(message.error) {
      printedText = message.error;
    } else  {
      printedText = message;
    }
    document.getElementById('errorMessage').textContent = printedText;
    document.getElementById('errorWrapper').classList.remove('hidden');

    waitAndHideError();
  };


  const waitAndHideError = async () => {

    //errors remain for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000)); 

    document.getElementById('errorWrapper').classList.add('fadeOut');

    //fade out animation takes 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000)); 

    document.getElementById('errorWrapper').classList.add('hidden');
    document.getElementById('errorWrapper').classList.remove('fadeOut');

  }
  

/* Sends post requests to the server using fetch. Will look for various
   entries in the response JSON object, and will handle them appropriately.
*/
const sendPost = async (url, data, handler) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  
    const result = await response.json();
    hideError();
  
    if(result.redirect) {
      window.location = result.redirect;
    }
  
    if(result.error) {
      handleError(result.error);
    }

    if(handler) {
      handler(result);
    }
  };

  const hideError = () => {
    document.getElementById('errorWrapper').classList.add('hidden');
  }


  module.exports = {
    handleError,
    sendPost,
    hideError,
  };