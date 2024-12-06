import { RouterProvider } from 'react-router-dom';
import router from './routes/router';
import './index.css';
import { ConversationProvider } from './context/ConversationContext';

function App() {


  return (
    <>
           <ConversationProvider>
              <RouterProvider router={router} /> 
           </ConversationProvider>,
    </>
  )
}


export default App;


