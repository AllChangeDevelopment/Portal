/**
 * Request - Sends an HTTP request to the API/RPC
 * @param {string} endpoint
 * @param {string?} method
 * @param {Object?} body
 * @param {boolean?} auth
 * @returns {Promise<any>}
 */
export const Request = async (endpoint, method="GET", body={}, auth=true) => {
    if (method === "GET") {
        let req = await fetch("http://77.68.127.58:8080/"+endpoint, {
            headers: {
                Authorization: (auth ? sessionStorage.token || localStorage.token : "")
            }
        })
        try {
            let res = await req.json()
            return res
        } catch(err) {
            console.log(err)
        }
    } else {
        let req = await fetch("http://77.68.127.58:8080/"+endpoint, {
            headers: {
                Authorization: (auth ? sessionStorage.token || localStorage.token : ""),
                "Content-Type": "application/json"
            },
            method: method,
            body: JSON.stringify(body)
        })
        try {
            let res = await req.json()
            return res
        } catch(err) {
            console.log(err)
        }
    }
}