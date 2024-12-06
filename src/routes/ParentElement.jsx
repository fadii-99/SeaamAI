import { Outlet } from "react-router-dom";



function ParentElement() {
 
    
  return (
    <>
      <div className="w-full max-h-full h-full">
      <Outlet />
      </div>
    </>
  )
}



export default ParentElement;
