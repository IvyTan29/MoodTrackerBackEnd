import { User } from '../model/User.js';
import { Entry } from '../model/Entry.js';
import { Tag } from '../model/Tag.js';

const tagCtrl = {
    // FIXME: edit it to insights
    getTagsOfUser: (req, res) => {
        User.aggregate([
                {$match: { $expr : { $eq: ['$_id' , { $toObjectId: req.session.userId }] } }},
                {$lookup: { 
                localField: 'tags', 
                from: 'Tag', 
                foreignField: '_id', 
                as: 'tag' 
                }},
                {$unwind: "$tag"},
                {$project: {tag: 1, _id: 0}}
            ])
            .then(listTags => {
                console.log(listTags)
        
                if (listTags.length === 0) {
                    res.status(404).error('Tags not found');
                } else {
                    res.status(200).json(listTags)
                }
            })
            .catch(err => {
                console.log(err)
                res.status(404).send('Tags not found');
            });
    },

    getRecentTags: (req, res) => {
        Tag.aggregate([
            {$match: { "recent": 1}},
            {$group: {_id: "$name"}}
        ])
        .then(listTags => {
            if (listTags.length === 0) {
                res.status(404).send('No recent tags');
            } else {
                res.status(200).json(listTags)
            }
        })
        .catch(err => {
            console.log(err)
            res.status(404).send('No recent tags');
        });
    },

    getTableTags: (req, res) => {
        Tag.aggregate([
            {$match: { "recent": 0}},
            {$group: {_id: "$name"}}
        ])
        .then(listTags => {
            if (listTags.length === 0) {
                res.status(404).send('No table tags');
            } else {
                res.status(200).json(listTags)
            }
        })
        .catch(err => {
            console.log(err)
            res.status(404).send('No table tags');
        });
    },

    putTags: (req, res) => {
        Entry.findById(req.params.entryId)
            .then(entryDoc => {
                console.log(entryDoc.tags)

                return Tag.deleteMany(
                    {_id: {$in: entryDoc.tags}}
                )
            })
            .then(deletedTags => {
                return Tag.insertMany(
                    req.body
                )
            })
            .then(tagDocs => {
                let arrayIds = tagDocs.map( tagItem => { return tagItem._id })

                return User.findByIdAndUpdate(
                        req.session.userId,
                        {"tags": arrayIds},
                        { new: true }
                    ) 
            })
            .then(userDoc => {
                return Entry.findByIdAndUpdate(
                    req.params.entryId,
                    {"tags": userDoc.tags}
                ) 
            })
            .then(secondEntryDoc => {
                res.status(200).send("Tag Array Updated")
            })
            .catch(err => {
                console.log(err)
                res.status(404).send(err.message);
            })
    },

    postTagToEntryAndUser: (req, res) => {
        Tag.insertMany(
                req.body
            )
            .then(tagDocs => {
                let arrayIds = tagDocs.map( tagItem => { return tagItem._id })

                return User.findByIdAndUpdate(
                        req.session.userId,
                        {"tags": arrayIds},
                        { new: true }
                    ) 
            })
            .then(userDoc => {
                return Entry.findByIdAndUpdate(
                    req.params.entryId,
                    {"tags": userDoc.tags}
                ) 
            })
            .then(entryDoc => {
                res.status(200).send("Tag Array Updated")
            })
            .catch(err => {
                console.log(err)
                res.status(404).send(err.message);
            })
    },

    // NOT NEEDED IN OUR APP
    getOneTagOfUser: (req, res) => {
        User.aggregate([
                {$match: { $expr : { $eq: ['$_id' , { $toObjectId: req.session.userId }] } }},
                {$unwind: "$tags"},
                {$match: { $expr : { $eq: ['$tags' , { $toObjectId: req.params.tagId }] } }},
                {$lookup: { 
                localField: 'tags', 
                from: 'Tag', 
                foreignField: '_id', 
                as: 'tag' 
                }},
                {$unwind: "$tag"},
                {$project: {tag: 1, _id: 0}}
            ])
            .then(listTags => {
                if (listTags.length === 0) {
                    res.status(404).send('Tag not found');
                } else {
                    res.status(200).json(listTags[0])
                }
            })
            .catch(err => {
                console.log(err)
                res.status(404).send('Tag not found');
            });
    },

    // NOT NEEDED IN OUR APP
    postTag: (req, res) => {
        let tag = new Tag(req.body);

        tag.save()
            .then(tagDoc => {
                console.log("New tag created sucessfully!")

                res.status(201).json(tagDoc)
                return User.findByIdAndUpdate(
                            req.session.userId,
                            {$push: {"tags": tagDoc._id}}
                            ) 
            })
            .then(userDoc => {
                console.log(userDoc)
            })
            .catch(err => {
                console.log(err)
                res.status(404).send(err.message);
            })
    },

    // NOT NEEDED IN OUR APP
    putTag: (req, res) => {
        Tag.findOneAndUpdate(
                { _id: req.params.tagId},
                req.body,
                {upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true, context: 'query', rawResult: true}
            )
            .then(raw => {
                res.status(200).json(raw.value)
        
                if (!raw.lastErrorObject.updatedExisting) {
                return User.findByIdAndUpdate(
                                req.session.userId,
                                {$push: {"tags": raw.value._id}}
                            ) 
                }
            })
            .then(userDoc => {
                console.log(userDoc)
            })
            .catch(err => {
                console.log(err)
                res.status(500).send('Internal Server Error');
            });
    },

    // NOT NEEDED IN OUR APP
    deleteTag: (req, res) => {
        User.findByIdAndUpdate(
                req.session.userId,
                {$pull: {"tags": req.params.tagId}}
            ) 
            .then(userDoc => {
                return Tag.deleteOne({ _id: req.params.tagId})
            })
            .then(tagDoc => {
                res.status(200).send('Tag Deleted')
            })
            .catch(err => {
                console.log(err)
                res.status(500).send('Internal server error - unable to delete tag');
            });
    }
}

export { tagCtrl }