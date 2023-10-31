import React, {useState, useEffect} from "react"
import Levenshtein from 'levenshtein'
import Stack from "./Dashboards/Stack.jsx";
import {Request} from "./Util.js"

export default function Database() {
    const [filter1, setFilter1] = useState("")
    const [filter2, setFilter2] = useState("")
    const [filter3, setFilter3] = useState("")
    const [filter4, setFilter4] = useState("")

    const [data, setData] = useState([])
    const [data1, setData1] = useState([])
    const [data2, setData2] = useState([])
    const [data3, setData3] = useState([])

    useEffect(() => {
        const f = async () => {
            setData(await Request("api/suggestions"))
            setData1(await Request("api/bugreports"))
            setData2(await Request("api/tasks"))
            setData3(await Request("rpc/getAllUsers"))
        }
        f().then(()=>{})
    }, [])

    const sortData = (teststring, strings, field="title", sfield="desc") => {
        let strwithval = []

        strings.forEach(str => {
            strwithval.push(new Levenshtein(str[field], teststring).valueOf())
        })

        strwithval.forEach((str, count) => {
            strwithval[count] = {title: strings[count][field], val: str}
        })

        let sortedArr = strwithval.sort(
            (p1, p2) => (p1.val > p2.val) ? 1 : (p1.val < p2.val) ? -1 : 0);

        return sortedArr.map(str => {
            return (
                <div>
                    <button data-toggle="modal" data-target={`#modal-${str._id}`} type="button"
                            className="btn btn-light mx-auto border border-dark pt-2 m-2 text-center w-100">
                        <h3>{str.title}</h3>
                    </button>
                </div>
            )
        })
    }

    return (
        <div>
            <h1 className="text-center p-4">Master search</h1>
            <div className="container-fluid">
                <div className="row justify-content-around mb-4">
                    <div className="col-5 border border-primary rounded">
                        <h2 className="text-center pt-4">Suggestions</h2>
                        <input placeholder="Filter title by" type="text" id="titleFilter" className="form-control mb-3" onChange={e => setFilter1(e.target.value)} />
                        <Stack>{sortData(filter1, data, "title", "description")}</Stack>
                    </div>
                    <div className="col-5 border border-primary rounded">
                        <h2 className="text-center pt-4">Bug reports</h2>
                        <input placeholder="Filter title by" type="text" id="titleFilter" className="form-control mb-3" onChange={e => setFilter2(e.target.value)} />
                        <Stack>{sortData(filter2, data1, "title", "description")}</Stack>
                    </div>
                </div>
                <div className="row justify-content-around mb-4">
                    <div className="col-5 border border-primary rounded">
                        <h2 className="text-center pt-4">Tasks</h2>
                        <input placeholder="Filter title by" type="text" id="titleFilter" className="form-control mb-3" onChange={e => setFilter3(e.target.value)} />
                        <Stack>{sortData(filter3, data2, "title", "description")}</Stack>
                    </div>
                    <div className="col-5 border border-primary rounded">
                        <h2 className="text-center pt-4">Users</h2>
                        <input placeholder="Filter title by" type="text" id="titleFilter" className="form-control mb-3" onChange={e => setFilter4(e.target.value)} />
                        <Stack>{sortData(filter4, data3, "username", "_id")}</Stack>
                    </div>
                </div>
            </div>
        </div>
    )
}