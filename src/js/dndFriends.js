/******************
 * VK.com connection
 ******************/
function render(listToRender, whereToAppend) {
    var list = {
        ofFriends: listToRender
    };
    var template =`
        {{#each ofFriends}}
            <li class="draggable" id="{{id}}">
                <img class="photo" src ="{{photo}}">
                <div class="name">{{name}} {{surname}}</div>
                <div class="{{style}}"></div>
            </li>
        {{/each}}`;
    var templateFn = Handlebars.compile(template);

    whereToAppend.innerHTML = templateFn(list);
};
function vkApi(method, options) {
    if (!options.v) {
        options.v = '5.64';
    }

    return new Promise((resolve, reject) => {
        VK.api(method, options, response => {
            if (response.error) {
                reject(new Error(response.error.error_msg));
            } else {
                resolve(response);
            }
        })
    })
};
function vkInit() {
    return new Promise((resolve, reject)=> {
        VK.init({
            apiId: 6066978
        });

        VK.Auth.login((response) => {
            if (response.session) {
                resolve(response.session);
            } else {
                reject(new Error('Couldn\'t log in'));
            }
        }, 2)
    })
};
new Promise(resolve => window.onload = resolve)
    .then(() => vkInit())
    .then(() => vkApi('friends.get', {fields: 'photo_100'}))
    .then(result => {
        return new Promise((resolve, reject) => {
            var friends = {
                justFriends: [],
                chosenFriends: []
            };

            result.response.items.forEach(i => {
                var currName = new Friend(i.first_name, i.last_name, i.photo_100, i.id)
                friends.justFriends .push(currName);
            })

            function Friend(name, surname, photo, id) {
                this.name = name;
                this.surname = surname;
                this.photo = photo;
                this.id = id;
                this.style = 'add_remove_left';
            }

            if ((localStorage.leftList) || (localStorage.rightList)) {
                friends.justFriends = JSON.parse(localStorage.leftList);
                friends.chosenFriends = JSON.parse(localStorage.rightList);
            }

            render(friends.justFriends, document.querySelector('.friends-left'));
            render(friends.chosenFriends, document.querySelector('.friends-right'));
            resolve(friends);
        })
    })
    .then(friends => {
        var leftInput = document.querySelector('.lft_inpt');
        var rightInput = document.querySelector('.rght_inpt');
        var friendsLeft = document.querySelector('.friends-left');
        var friendsRight = document.querySelector('.friends-right');
        var saveLists = document.querySelector('.save_users');

        function deleteAdd(itemToDeleteAdd) {
            var getId = itemToDeleteAdd.getAttribute('id');
            friends.justFriends.forEach((item, i) => {
                if (item.id == getId) {
                    friends.justFriends.splice(i, 1);
                    item.style = 'add_remove_right';
                    friends.chosenFriends.push(item);
                    render(friends.justFriends, friendsLeft);
                    render(friends.chosenFriends, friendsRight);
                };
            });
        };
        function deleteAddReverse(itemToDeleteAdd) {
            var getId = itemToDeleteAdd.getAttribute('id');
            friends.chosenFriends.forEach((item, i) => {
                if (item.id == getId) {
                    friends.chosenFriends.splice(i, 1);
                    item.style = 'add_remove_left';
                    friends.justFriends.push(item);
                    render(friends.justFriends, friendsLeft);
                    render(friends.chosenFriends, friendsRight);
                    console.log(item);
                };
            });
        };
        function getCoords(elem) { // кроме IE8-
            var box = elem.getBoundingClientRect();

            return {
                top: box.top + pageYOffset,
                left: box.left + pageXOffset
            };
        };
        function filterFriend(chunk, listOfFriends) {
            var pickedNames = [];

            listOfFriends.forEach(listName => {
                if (isMatching(chunk, listName)) {
                    pickedNames.push(listName);
                }
            })

            function isMatching(chunk, listName) {
                chunk = chunk.toLowerCase();

                var Name = listName.name.toLowerCase();
                var Surname = listName.surname.toLowerCase();
                if ((~Name.indexOf(chunk)) || (~Surname.indexOf(chunk))) {
                    return true;
                } else {
                    return false;
                }
            }

            return pickedNames;
        };

        leftInput.addEventListener('keyup', (e) => {
            var chunk = leftInput.value;

            chunk = chunk.replace(/\s/g, '');
            render(filterFriend(chunk, friends.justFriends), friendsLeft);
        });
        rightInput.addEventListener('keyup', (e) => {
            var chunk = rightInput.value;

            chunk = chunk.replace(/\s/g, '');
            render(filterFriend(chunk, friends.chosenFriends), friendsRight)
        });
        friendsLeft.addEventListener('mousedown', (e) => {
            var elem = e.target.closest('.draggable');
            var coords = getCoords(elem);
            var shiftX = e.pageX - coords.left;
            var shiftY = e.pageY - coords.top;

            function moveAt(e) {
                if (elem) {
                    elem.style.left = e.pageX - shiftX + 'px';
                    elem.style.top = e.pageY - shiftY + 'px';
                }
            }

            if(!elem) return;
            if (e.target.className == 'add_remove_left') {
                deleteAdd(e.target.parentElement);
            }

            elem.style.position = 'absolute';
            elem.style.zIndex = 1000;

            moveAt(e);

            document.addEventListener('mousemove', (e) => {
                moveAt(e);
            });

            document.addEventListener('mouseup', (e) => {
                var dropElem = findDrop(elem);

                function findDrop(element) {
                    if (element) {
                        element.style.display = 'none';
                        var curr_cursor = document.elementFromPoint(event.clientX, event.clientY);
                        element.style.display = 'inline-block';

                        return curr_cursor.closest('.droppable');
                    }
                }

                if(dropElem) {
                    elem.style = 0;
                    deleteAdd(elem);
                    elem = null;
                }
            });

            elem.ondragstart = function() {
                return false;
            }
        });
        friendsRight.addEventListener('click', (e) => {
            console.log(e.target.className);
            if (e.target.className == 'add_remove_right') {
                deleteAddReverse(e.target.parentElement);
            }
        });
        saveLists.addEventListener('click', (e) => {
            localStorage.leftList = JSON.stringify(friends.justFriends );
            localStorage.rightList = JSON.stringify(friends.chosenFriends);
        });
    })
