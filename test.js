import xmlFormat from 'xml-formatter';
// Define the API URL
const apiUrl = 'https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=a979c1a664874776b232e046f75a5e24&stpid=30268';

const fetchData = async () => {
    try {
      const response = await fetch(apiUrl); // Wait for the fetch to complete
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.text(); // Or use response.json() for JSON data
      // console.log(data); // Log the data
      return data; // Return the data so it can be used
    } catch (error) {
      // console.error('Error:', error);
      return null; // Handle error and return null or a default value
    }
  };
  
  (async () => {
    const fetchedData = await fetchData(); // Wait for fetchData to resolve
    // console.log('Fetched Data:', fetchedData); // Use the data here
    const formatted = format(fetchedData);
    console.log(formatted);
  })();
